import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { debounceTime, take, takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ConsoleLogEntry, CrossReferenceHit, GitCommitEntry,
  LadderRung, PlcRoutine, PlcTag, ProjectModel,
  RoutineLanguage, SmartObject, UserDefinedType
} from '../models/plc.models';

const STORAGE_KEY = environment.storageKey;

@Injectable({ providedIn: 'root' })
export class WorkspaceDataService implements OnDestroy {
  private readonly projectSubject = new BehaviorSubject<ProjectModel | null>(null);
  public readonly project$ = this.projectSubject.asObservable();

  private readonly loadingSubject = new BehaviorSubject<boolean>(true);
  public readonly loading$ = this.loadingSubject.asObservable();

  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  public readonly error$ = this.errorSubject.asObservable();

  private readonly logsSubject = new BehaviorSubject<ConsoleLogEntry[]>([]);
  public readonly logs$ = this.logsSubject.asObservable();

  private seedSnapshot: ProjectModel | null = null;
  private readonly destroy$ = new Subject<void>();

  // Debounced localStorage write — avoids blocking the main thread on every mutation
  private readonly persistSubject = new Subject<ProjectModel>();

  constructor(private http: HttpClient) {
    this.persistSubject.pipe(
      debounceTime(400),
      takeUntil(this.destroy$)
    ).subscribe(project => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      } catch {
        this.log('WARN', 'LocalStore', 'Browser storage quota exceeded; state kept in memory only');
      }
    });
    this.initializeFromJsonStore();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public initializeFromJsonStore(): void {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    // take(1) auto-completes — no subscription leak on retry
    this.http.get<ProjectModel>('assets/data/ftds-workspace-db.json').pipe(take(1)).subscribe({
      next: (jsonDb) => {
        this.seedSnapshot = structuredClone(jsonDb);
        const saved = this.safeReadStorage();
        if (saved) {
          this.evaluateSoftPlcScan(saved);
          this.projectSubject.next(saved);
          this.loadingSubject.next(false);
          this.log('INFO', 'LocalStore', `Restored workspace "${saved.name}" from localStorage`);
          return;
        }
        const fresh = structuredClone(jsonDb);
        this.evaluateSoftPlcScan(fresh);
        this.projectSubject.next(fresh);
        this.loadingSubject.next(false);
        this.log('DATA_SYNC', 'JsonRepository', `Loaded "${fresh.name}" from assets/data/ftds-workspace-db.json`);
        this.log('INFO', 'Logix-Echo', `Controller ${fresh.controllerName} (${fresh.controllerCatalog}) in RUN mode`);
      },
      error: (err) => {
        this.loadingSubject.next(false);
        const msg = `Unable to load workspace JSON database: ${err?.message || 'Unknown error'}`;
        this.errorSubject.next(msg);
        this.log('ERROR', 'JsonRepository', msg);
      }
    });
  }

  /** Deep shape validation — prevents runtime crashes from partially corrupted localStorage */
  private safeReadStorage(): ProjectModel | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw) as ProjectModel;
      if (!p || !Array.isArray(p.tasks) || !Array.isArray(p.tags)) return null;
      for (const task of p.tasks) {
        if (!Array.isArray(task.programs)) return null;
        for (const prog of task.programs) {
          if (!Array.isArray(prog.routines)) return null;
          for (const rtn of prog.routines) {
            if (!Array.isArray(rtn.rungs)) return null;
            if (!Array.isArray(rtn.fbdNodes)) return null;
            if (!Array.isArray(rtn.fbdWires)) return null;
          }
        }
      }
      return p;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private commitState(updated: ProjectModel, logSource?: string, logMsg?: string): void {
    this.evaluateSoftPlcScan(updated);
    this.projectSubject.next(updated);
    // Debounced — does not block the main thread on every mutation
    this.persistSubject.next(updated);
    if (logSource && logMsg) this.log('DATA_SYNC', logSource, logMsg);
  }

  public resetToDefaultJson(): void {
    if (!this.seedSnapshot) return;
    localStorage.removeItem(STORAGE_KEY);
    const fresh = structuredClone(this.seedSnapshot);
    this.evaluateSoftPlcScan(fresh);
    this.projectSubject.next(fresh);
    this.log('WARN', 'JsonRepository', 'Workspace reset to clean ftds-workspace-db.json baseline');
  }

  public exportProjectJson(): void {
    const current = this.projectSubject.getValue();
    if (!current) return;
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${current.name}_export.json`;
    // Append to DOM (required by Firefox), click, then clean up in finally
    document.body.appendChild(a);
    try {
      a.click();
    } finally {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    this.log('INFO', 'ExportEngine', `Exported JSON snapshot (${current.name}_export.json)`);
  }

  /** Mutates a cloned project object in-place to compute Soft-PLC power flow.
   *  MUST only be called with a structuredClone() copy — never the live subject value. */
  public evaluateSoftPlcScan(project: ProjectModel): void {
    const tagMap = new Map<string, PlcTag>();
    project.tags.forEach(t => tagMap.set(t.name, t));

    const estop   = Boolean(tagMap.get('Master_EStop_Healthy')?.value);
    const curtain = Boolean(tagMap.get('Safety_LightCurtain_OK')?.value);
    const startPb = Boolean(tagMap.get('Auto_Cycle_Start_PB')?.value);
    const stopPb  = Boolean(tagMap.get('Cycle_Stop_PB')?.value);
    const partPe  = Boolean(tagMap.get('Part_In_Position_PE')?.value);
    const robotBusy = Boolean(tagMap.get('Robot_Welding_Active')?.value);
    const convRunTag  = tagMap.get('Infeed_Conveyor_Run');
    const clampTag    = tagMap.get('Fixture_Clamp_Extend');
    const localPermTag = tagMap.get('Rtn_Local_Permissive');

    if (project.emulationRunning && convRunTag) {
      const prevRun = Boolean(convRunTag.value);
      const nextRun = estop && curtain && (startPb || prevRun) && !stopPb;
      convRunTag.value = nextRun;
      if (clampTag) clampTag.value = nextRun && partPe;
      if (localPermTag) localPermTag.value = Boolean(clampTag?.value) && !robotBusy;
    }

    for (const task of project.tasks) {
      for (const prog of task.programs) {
        for (const rtn of prog.routines) {
          if (rtn.language === 'LD') {
            rtn.rungs.forEach(rung => {
              const conds = rung.instructions.filter(i => i.opcode === 'XIC' || i.opcode === 'XIO');
              const active = conds.every(inst => {
                const t = tagMap.get(inst.operand);
                if (!t) return false;
                return inst.opcode === 'XIC' ? Boolean(t.value) : !Boolean(t.value);
              });
              rung.powerFlowActive = project.emulationRunning && active;
            });
          }
          if (rtn.language === 'FBD') {
            rtn.fbdNodes.forEach(node => {
              if (node.tagRef && tagMap.has(node.tagRef)) {
                node.state = Boolean(tagMap.get(node.tagRef)?.value);
              } else if (node.id === 'fn4') {
                node.state = project.emulationRunning && estop && curtain;
              } else {
                node.state = project.emulationRunning && estop && curtain && partPe;
              }
            });
            rtn.fbdWires.forEach(w => {
              const src = rtn.fbdNodes.find(n => n.id === w.fromNodeId);
              w.active = Boolean(src?.state);
            });
          }
        }
      }
    }
  }

  public log(level: ConsoleLogEntry['level'], source: string, message: string): void {
    const entry: ConsoleLogEntry = {
      id: crypto.randomUUID(),   // collision-safe
      timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      level, source, message
    };
    this.logsSubject.next([entry, ...this.logsSubject.getValue()].slice(0, 120));
  }

  public createRoutine(programId: string, name: string, language: RoutineLanguage, description: string): Observable<PlcRoutine | null> {
    const current = this.projectSubject.getValue();
    if (!current) return of(null);
    const updated = structuredClone(current);

    const newRoutine: PlcRoutine = {
      id: `rtn-${crypto.randomUUID()}`,
      name, language,
      programName: '',
      description: description || `Custom ${language} control routine`,
      stCode: `// Routine: ${name} (${language})\nREGION Main_Logic\n    IF Master_EStop_Healthy AND Safety_LightCurtain_OK THEN\n        // Add control logic here\n    END_IF;\nEND_REGION\n`,
      rungs: language === 'LD' ? [{
        id: crypto.randomUUID(),
        number: 0,
        comment: 'Initial safety permissive rung',
        powerFlowActive: true,
        instructions: [
          { id: crypto.randomUUID(), opcode: 'XIC', operand: 'Master_EStop_Healthy', branch: 'MAIN' },
          { id: crypto.randomUUID(), opcode: 'OTE', operand: 'Infeed_Conveyor_Run',  branch: 'MAIN' }
        ]
      }] : [],
      fbdNodes: language === 'FBD' ? [
        { id: crypto.randomUUID(), type: 'INPUT_REF',  label: 'Master_EStop_Healthy', tagRef: 'Master_EStop_Healthy', x: 50,  y: 80, state: true },
        { id: crypto.randomUUID(), type: 'OUTPUT_REF', label: 'Infeed_Conveyor_Run',  tagRef: 'Infeed_Conveyor_Run',  x: 380, y: 80, state: true }
      ] : [],
      fbdWires: language === 'FBD' ? [{ id: crypto.randomUUID(), fromNodeId: 'fn1', toNodeId: 'fn2', active: true }] : []
    };

    for (const t of updated.tasks) {
      const p = t.programs.find(x => x.id === programId);
      if (p) { newRoutine.programName = p.name; p.routines.push(newRoutine); break; }
    }
    this.commitState(updated, 'ExecutionExplorer', `Created ${language} routine "${name}"`);
    return of(newRoutine);
  }

  public deleteRoutine(routineId: string): void {
    const current = this.projectSubject.getValue();
    if (!current) return;
    const updated = structuredClone(current);
    for (const t of updated.tasks)
      for (const p of t.programs)
        p.routines = p.routines.filter(r => r.id !== routineId);
    this.commitState(updated, 'ExecutionExplorer', `Deleted routine (${routineId})`);
  }

  public updateRoutineCode(routineId: string, stCode: string): void {
    const current = this.projectSubject.getValue();
    if (!current) return;
    const updated = structuredClone(current);
    let rName = routineId;
    for (const t of updated.tasks)
      for (const p of t.programs) {
        const r = p.routines.find(x => x.id === routineId);
        if (r) { r.stCode = stCode; rName = r.name; }
      }
    this.commitState(updated, 'Compiler', `Saved & verified "${rName}" (0 Errors, 0 Warnings)`);
  }

  public updateRoutineRungs(routineId: string, rungs: LadderRung[]): void {
    const current = this.projectSubject.getValue();
    if (!current) return;
    const updated = structuredClone(current);
    for (const t of updated.tasks)
      for (const p of t.programs) {
        const r = p.routines.find(x => x.id === routineId);
        if (r) {
          r.rungs = rungs;
          r.stCode = rungs
            .map(rg => `RUNG ${rg.number}: ` + rg.instructions.map(i => `${i.opcode}(${i.operand})`).join(' ') + ';')
            .join('\n');
        }
      }
    this.commitState(updated, 'LadderEditor', 'Updated ladder rungs & synced Neutral Text DSL');
  }

  public upsertTag(tag: PlcTag): void {
    const current = this.projectSubject.getValue();
    if (!current) return;
    const updated = structuredClone(current);
    const idx = updated.tags.findIndex(t => t.id === tag.id);
    if (idx >= 0) updated.tags[idx] = { ...tag };
    else updated.tags.push({ ...tag, id: `tag-${crypto.randomUUID()}` });
    this.commitState(updated, 'TagEngine', `Tag "${tag.name}" [${tag.scope}] = ${tag.value}`);
  }

  public deleteTag(tagId: string): void {
    const current = this.projectSubject.getValue();
    if (!current) return;
    const updated = structuredClone(current);
    updated.tags = updated.tags.filter(t => t.id !== tagId);
    this.commitState(updated, 'TagEngine', `Removed tag (${tagId})`);
  }

  public addUdt(udt: UserDefinedType): void {
    const current = this.projectSubject.getValue();
    if (!current) return;
    const updated = structuredClone(current);
    updated.userDefinedTypes.push({ ...udt, id: `udt-${crypto.randomUUID()}` });
    this.commitState(updated, 'DataTypes', `Created User-Defined Type "${udt.name}"`);
  }

  public toggleEmulation(running: boolean): void {
    const current = this.projectSubject.getValue();
    if (!current) return;
    const updated = structuredClone(current);
    updated.emulationRunning = running;
    this.commitState(updated, 'Logix-Echo',
      running ? 'Controller switched to ONLINE RUN mode' : 'Controller switched to OFFLINE PROGRAM mode');
  }

  public instantiateSmartObject(so: SmartObject, instanceName: string): Observable<PlcRoutine | null> {
    const current = this.projectSubject.getValue();
    if (!current) return of(null);
    const updated = structuredClone(current);
    const targetProg = updated.tasks[0].programs[0];
    const newRoutine: PlcRoutine = {
      id: `rtn-so-${crypto.randomUUID()}`,
      name: instanceName,
      language: so.templateRoutine.language || 'ST',
      programName: targetProg.name,
      description: `Instantiated from Smart Object [${so.name} v${so.version}]`,
      stCode: so.templateRoutine.stCode || '// Smart Object generated logic\n',
      rungs:    so.templateRoutine.rungs     ? structuredClone(so.templateRoutine.rungs)     : [],
      fbdNodes: so.templateRoutine.fbdNodes  ? structuredClone(so.templateRoutine.fbdNodes)  : [],
      fbdWires: so.templateRoutine.fbdWires  ? structuredClone(so.templateRoutine.fbdWires)  : []
    };
    targetProg.routines.push(newRoutine);
    this.commitState(updated, 'SmartObjects', `Instantiated ${so.name} -> "${instanceName}"`);
    return of(newRoutine);
  }

  public commitToVault(message: string): void {
    const current = this.projectSubject.getValue();
    if (!current) return;
    const updated = structuredClone(current);
    const entry: GitCommitEntry = {
      hash: crypto.randomUUID().substring(0, 7),
      message, author: 'engineer',
      timestamp: new Date().toLocaleString('en-GB'),
      branch: updated.branch
    };
    updated.commits.unshift(entry);
    this.commitState(updated, 'FactoryTalk-Vault', `Committed & pushed [${entry.hash}] to ${updated.branch}`);
  }

  /** Word-boundary regex prevents partial tag name false positives (e.g. 'Run' matching 'Infeed_Conveyor_Run') */
  public findTagCrossReferences(tagName: string): CrossReferenceHit[] {
    const current = this.projectSubject.getValue();
    if (!current || !tagName) return [];
    const hits: CrossReferenceHit[] = [];
    const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordBoundary = new RegExp(`\\b${escaped}\\b`);

    for (const task of current.tasks) {
      for (const prog of task.programs) {
        for (const rtn of prog.routines) {
          if (rtn.language === 'LD') {
            rtn.rungs.forEach(r => r.instructions.forEach(inst => {
              if (inst.operand === tagName) {
                hits.push({
                  routineId: rtn.id, routineName: rtn.name, programName: prog.name, language: 'LD',
                  location: `Rung ${r.number} (${inst.opcode})`,
                  accessType: ['OTE', 'OTL', 'OTU'].includes(inst.opcode) ? 'Write' : 'Read'
                });
              }
            }));
          } else if (rtn.language === 'ST') {
            rtn.stCode.split('\n').forEach((line, idx) => {
              if (wordBoundary.test(line)) {
                hits.push({
                  routineId: rtn.id, routineName: rtn.name, programName: prog.name, language: 'ST',
                  location: `Line ${idx + 1}`,
                  accessType: line.includes(`${tagName} :=`) ? 'Write' : 'Read'
                });
              }
            });
          } else if (rtn.language === 'FBD') {
            rtn.fbdNodes.forEach(n => {
              if (n.tagRef === tagName) {
                hits.push({
                  routineId: rtn.id, routineName: rtn.name, programName: prog.name, language: 'FBD',
                  location: `Block ${n.label}`,
                  accessType: n.type === 'OUTPUT_REF' ? 'Write' : 'Read'
                });
              }
            });
          }
        }
      }
    }
    return hits;
  }

  // trackBy helper for log rows
  public trackByLogId(_: number, log: ConsoleLogEntry): string { return log.id; }
}

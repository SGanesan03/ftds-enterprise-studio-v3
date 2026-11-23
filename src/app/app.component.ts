import { Component, OnInit, HostListener, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import {
  ConsoleLogEntry, CrossReferenceHit, ProjectModel, RoutineLanguage, SmartObject
} from './core/models/plc.models';
import { WorkspaceDataService } from './core/services/workspace-data.service';
import { EditorTab, NavigationHandlerService, SidebarSection } from './core/services/navigation-handler.service';

export interface MenuAction {
  label: string;
  icon?: string;
  shortcut?: string;
  divider?: boolean;
  disabled?: boolean;
  action?: () => void;
}

export interface MenuItem {
  label: string;
  items: MenuAction[];
}

export interface ContextMenu {
  x: number;
  y: number;
  items: MenuAction[];
}

export interface TreeNode {
  id: string;
  label: string;
  icon: string;
  level: number;
  type: 'controller' | 'folder' | 'task' | 'program' | 'routine' | 'tags' | 'udt' | 'io';
  routineId?: string;
  routineLang?: RoutineLanguage;
  taskName?: string;
  progName?: string;
  children?: TreeNode[];
}

@Component({
  selector: 'ftds-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  public project?: ProjectModel;
  public isLoading = true;
  public loadError: string | null = null;

  public activeSidebar: SidebarSection = 'EXPLORER';
  public tabs: EditorTab[] = [];
  public activeTabId = '';
  public bottomPanelOpen = true;
  public bottomPanelTab = 'Output';
  public logs: ConsoleLogEntry[] = [];

  public showNewRoutineModal = false;
  public newRoutineName = '';
  public newRoutineLang: RoutineLanguage = 'LD';
  public commitMessage = '';

  public xrefTag = '';
  public xrefHits: CrossReferenceHit[] = [];

  public leftPanelWidth = 240;
  public rightPanel = 'COPILOT';
  public copilotInput = '';
  public currentUser = 'Engineer';

  // Cached flat tree — rebuilt only when tree structure or expand state changes
  public flatNodes: TreeNode[] = [];
  private treeNodes: TreeNode[] = [];
  public expandedNodes = new Set<string>(['ctrl-root', 'node-tasks', 'node-task-0', 'node-prog-0-0']);

  // Cached JSON summary — rebuilt only when project$ emits
  public liveJsonSummary = '{}';

  public activeMenu: string | null = null;
  public contextMenu: ContextMenu | null = null;

  public menuBar: MenuItem[] = [
    {
      label: 'File', items: [
        { label: 'New Project',     icon: 'fi fi-rr-file-add',    shortcut: 'Ctrl+N' },
        { label: 'Open Project',    icon: 'fi fi-rr-folder-open', shortcut: 'Ctrl+O' },
        { label: 'Close Project',   icon: 'fi fi-rr-cross-circle' },
        { label: '', divider: true },
        { label: 'Save',            icon: 'fi fi-rr-disk',        shortcut: 'Ctrl+S', action: () => this.dataService.exportProjectJson() },
        { label: 'Save As...',      icon: 'fi fi-rr-copy-alt',    shortcut: 'Ctrl+Shift+S' },
        { label: '', divider: true },
        { label: 'Export JSON',     icon: 'fi fi-rr-file-export', action: () => this.dataService.exportProjectJson() },
        { label: 'Reset Workspace', icon: 'fi fi-rr-refresh',     action: () => this.dataService.initializeFromJsonStore() },
        { label: '', divider: true },
        { label: 'Exit',            icon: 'fi fi-rr-sign-out' }
      ]
    },
    {
      label: 'Edit', items: [
        { label: 'Undo',    icon: 'fi fi-rr-undo',       shortcut: 'Ctrl+Z' },
        { label: 'Redo',    icon: 'fi fi-rr-redo',       shortcut: 'Ctrl+Y' },
        { label: '', divider: true },
        { label: 'Cut',     icon: 'fi fi-rr-scissors',   shortcut: 'Ctrl+X' },
        { label: 'Copy',    icon: 'fi fi-rr-copy',       shortcut: 'Ctrl+C' },
        { label: 'Paste',   icon: 'fi fi-rr-clipboard',  shortcut: 'Ctrl+V' },
        { label: '', divider: true },
        { label: 'Find',    icon: 'fi fi-rr-search',     shortcut: 'Ctrl+F' },
        { label: 'Replace', icon: 'fi fi-rr-search-alt', shortcut: 'Ctrl+H' }
      ]
    },
    {
      label: 'View', items: [
        { label: 'Project Explorer', icon: 'fi fi-rr-list-check', action: () => this.nav.setSidebarSection('EXPLORER') },
        { label: 'Smart Objects',    icon: 'fi fi-rr-cube',       action: () => this.nav.setSidebarSection('SMART_OBJECTS') },
        { label: 'Cross Reference',  icon: 'fi fi-rr-search',     action: () => this.nav.setSidebarSection('CROSS_REF') },
        { label: 'FT Vault',         icon: 'fi fi-rr-box-alt',    action: () => this.nav.setSidebarSection('GIT_VAULT') },
        { label: '', divider: true },
        { label: 'Output Panel',     icon: 'fi fi-rr-terminal',   action: () => this.nav.toggleBottomPanel() },
        { label: '', divider: true },
        { label: 'Zoom In',  icon: 'fi fi-rr-zoom-in',  shortcut: 'Ctrl++' },
        { label: 'Zoom Out', icon: 'fi fi-rr-zoom-out', shortcut: 'Ctrl+-' },
        { label: 'Reset Zoom', icon: 'fi fi-rr-expand', shortcut: 'Ctrl+0' }
      ]
    },
    {
      label: 'Project', items: [
        { label: 'Project Properties',    icon: 'fi fi-rr-settings' },
        { label: 'Controller Properties', icon: 'fi fi-rr-microchip' },
        { label: '', divider: true },
        { label: 'New Routine', icon: 'fi fi-rr-file-add', action: () => { this.showNewRoutineModal = true; this.activeMenu = null; } },
        { label: 'New Task',    icon: 'fi fi-rr-add' },
        { label: 'New Program', icon: 'fi fi-rr-add' }
      ]
    },
    {
      label: 'Controller', items: [
        { label: 'Go Online',  icon: 'fi fi-rr-play', action: () => this.toggleEmulator() },
        { label: 'Go Offline', icon: 'fi fi-rr-stop', action: () => this.toggleEmulator() },
        { label: '', divider: true },
        { label: 'Download',       icon: 'fi fi-rr-download', disabled: true },
        { label: 'Upload',         icon: 'fi fi-rr-upload' },
        { label: '', divider: true },
        { label: 'Verify Project', icon: 'fi fi-rr-check', action: () => this.verifyProject() }
      ]
    },
    {
      label: 'Logic', items: [
        { label: 'Add XIC Contact', icon: 'fi fi-rr-square' },
        { label: 'Add XIO Contact', icon: 'fi fi-rr-square' },
        { label: 'Add OTE Coil',    icon: 'fi fi-rr-circle' },
        { label: 'Add TON Timer',   icon: 'fi fi-rr-time-add' },
        { label: '', divider: true },
        { label: 'Add Rung', icon: 'fi fi-rr-add' }
      ]
    },
    {
      label: 'Communication', items: [
        { label: 'Who Active',        icon: 'fi fi-rr-network' },
        { label: 'EtherNet/IP Devices', icon: 'fi fi-rr-ethernet' },
        { label: '', divider: true },
        { label: 'Configure Drivers', icon: 'fi fi-rr-settings' }
      ]
    },
    {
      label: 'Tools', items: [
        { label: 'Tag Cross Reference', icon: 'fi fi-rr-search',      action: () => this.nav.setSidebarSection('CROSS_REF') },
        { label: 'JSON Inspector',      icon: 'fi fi-rr-code-branch', action: () => this.nav.setSidebarSection('JSON_INSPECTOR') },
        { label: '', divider: true },
        { label: 'Options', icon: 'fi fi-rr-settings' }
      ]
    },
    {
      label: 'Window', items: [
        { label: 'New Window',    icon: 'fi fi-rr-window' },
        { label: 'Split Editor', icon: 'fi fi-rr-layout-fluid' },
        { label: '', divider: true },
        // Uses nav.closeAllTabs() — single emission, no cascading side effects
        { label: 'Close All Tabs', icon: 'fi fi-rr-cross', action: () => this.nav.closeAllTabs() }
      ]
    },
    {
      label: 'Help', items: [
        { label: 'Documentation',       icon: 'fi fi-rr-book' },
        { label: 'Keyboard Shortcuts',  icon: 'fi fi-rr-keyboard', shortcut: 'Ctrl+K Ctrl+S' },
        { label: '', divider: true },
        { label: 'About FTDS', icon: 'fi fi-rr-info' }
      ]
    }
  ];

  private resizing = false;
  private resizeStartX = 0;
  private resizeStartW = 0;
  private firstProjectLoad = true;

  constructor(
    public dataService: WorkspaceDataService,
    public nav: NavigationHandlerService
  ) {}

  ngOnInit(): void {
    const until = takeUntilDestroyed(this.destroyRef);

    this.dataService.loading$.pipe(until).subscribe(l => (this.isLoading = l as boolean));
    this.dataService.error$.pipe(until).subscribe(e => (this.loadError = e as string | null));

    this.dataService.project$.pipe(until).subscribe(raw => {
      const p = raw as ProjectModel | null;
      if (!p) return;
      this.project = p;
      this.buildTree(p);
      this.rebuildFlatNodes();
      // Cache JSON summary — avoids JSON.stringify on every CD cycle
      this.liveJsonSummary = JSON.stringify({
        source: 'assets/data/ftds-workspace-db.json',
        project: p.name,
        controller: p.controllerName,
        emulationRunning: p.emulationRunning,
        tasksCount: p.tasks.length,
        tagsCount: p.tags.length,
        udtsCount: p.userDefinedTypes.length
      }, null, 2);
      // Open first routine dynamically — no hardcoded IDs in service
      if (this.firstProjectLoad && p.tasks[0]?.programs[0]?.routines[0]) {
        this.firstProjectLoad = false;
        const task = p.tasks[0];
        const prog = task.programs[0];
        const rtn  = prog.routines[0];
        this.nav.openRoutineTab(rtn.id, rtn.name, rtn.language, [task.name, prog.name, rtn.name]);
      }
      if (this.xrefTag) this.runCrossReference();
    });

    this.dataService.logs$.pipe(until).subscribe(l => (this.logs = l as ConsoleLogEntry[]));
    this.nav.activeSidebar$.pipe(until).subscribe(s => (this.activeSidebar = s as SidebarSection));
    this.nav.tabs$.pipe(until).subscribe(t => (this.tabs = t as EditorTab[]));
    this.nav.activeTabId$.pipe(until).subscribe(id => (this.activeTabId = id as string));
    this.nav.bottomPanelOpen$.pipe(until).subscribe(o => (this.bottomPanelOpen = o as boolean));
  }

  // ── Tree ──────────────────────────────────────────────────────────────────

  public buildTree(p: ProjectModel): void {
    this.treeNodes = [{
      id: 'ctrl-root', label: p.controllerName, icon: 'fi fi-sr-microchip',
      level: 0, type: 'controller',
      children: [
        { id: 'node-handlers', label: 'Handlers', icon: 'fi fi-rr-bolt', level: 1, type: 'folder', children: [] },
        {
          id: 'node-tasks', label: 'Tasks', icon: 'fi fi-rr-list-check', level: 1, type: 'folder',
          children: p.tasks.map((task, ti) => ({
            id: `node-task-${ti}`, label: task.name, icon: 'fi fi-sr-time-fast', level: 2, type: 'task' as const,
            children: task.programs.map((prog, pi) => ({
              id: `node-prog-${ti}-${pi}`, label: prog.name, icon: 'fi fi-rr-document', level: 3, type: 'program' as const,
              children: prog.routines.map(rtn => ({
                id: `node-rtn-${rtn.id}`, label: rtn.name,
                icon: rtn.language === 'LD' ? 'fi fi-rr-diagram-project'
                    : rtn.language === 'ST' ? 'fi fi-rr-code-simple'
                    : 'fi fi-rr-diagram-cells',
                level: 4, type: 'routine' as const,
                routineId: rtn.id, routineLang: rtn.language,
                taskName: task.name, progName: prog.name
              }))
            }))
          }))
        },
        { id: 'node-unscheduled', label: 'Unscheduled Programs', icon: 'fi fi-rr-folder', level: 1, type: 'folder', children: [] },
        { id: 'node-ctrl-tags',  label: `Controller Tags (${p.tags.length})`,          icon: 'fi fi-rr-tags',     level: 1, type: 'tags' },
        { id: 'node-data-types', label: `Data Types (${p.userDefinedTypes.length})`,   icon: 'fi fi-rr-cube',     level: 1, type: 'udt' },
        { id: 'node-io-config',  label: 'I/O Configuration',                           icon: 'fi fi-rr-ethernet', level: 1, type: 'io' }
      ]
    }];
  }

  /** Rebuild cached flat list — called only when tree structure or expandedNodes changes */
  public rebuildFlatNodes(): void {
    const result: TreeNode[] = [];
    const walk = (nodes: TreeNode[]) => {
      for (const n of nodes) {
        result.push(n);
        if (n.children && this.expandedNodes.has(n.id)) walk(n.children);
      }
    };
    walk(this.treeNodes);
    this.flatNodes = result;
  }

  public toggleNode(node: TreeNode, event: MouseEvent): void {
    event.stopPropagation();
    if (this.expandedNodes.has(node.id)) this.expandedNodes.delete(node.id);
    else this.expandedNodes.add(node.id);
    this.rebuildFlatNodes();
  }

  public clickNode(node: TreeNode): void {
    if (node.type === 'routine' && node.routineId && node.routineLang) {
      this.nav.openRoutineTab(node.routineId, node.label, node.routineLang, [node.taskName!, node.progName!, node.label]);
    } else if (node.type === 'tags') {
      this.nav.openTagsTab();
    } else if (node.type === 'udt') {
      this.nav.openUdtTab();
    } else if (node.type === 'io' || node.type === 'controller') {
      this.nav.openHardwareTab();
    } else if (node.children) {
      if (this.expandedNodes.has(node.id)) this.expandedNodes.delete(node.id);
      else this.expandedNodes.add(node.id);
      this.rebuildFlatNodes();
    }
  }

  public isNodeActive(node: TreeNode): boolean {
    if (node.type === 'routine') return this.activeTabId === `tab-${node.routineId}`;
    if (node.type === 'tags')    return this.activeTabId === 'tab-tags-matrix';
    if (node.type === 'udt')     return this.activeTabId === 'tab-udt-designer';
    if (node.type === 'io' || node.type === 'controller') return this.activeTabId === 'tab-hw-chassis';
    return false;
  }

  public hasChildren(node: TreeNode): boolean {
    return !!(node.children && node.children.length > 0);
  }

  // ── trackBy functions ─────────────────────────────────────────────────────

  public trackByTabId(_: number, tab: EditorTab): string       { return tab.id; }
  public trackByNodeId(_: number, node: TreeNode): string      { return node.id; }
  public trackByLogId(_: number, log: ConsoleLogEntry): string { return log.id; }
  public trackByMenuLabel(_: number, m: MenuItem): string      { return m.label; }
  public trackByActionLabel(_: number, a: MenuAction): string  { return a.label; }
  public trackByIndex(i: number): number                       { return i; }

  // ── Context Menus ─────────────────────────────────────────────────────────

  public showTreeContextMenu(event: MouseEvent, node: TreeNode): void {
    event.preventDefault();
    event.stopPropagation();
    const items: MenuAction[] = [];
    if (node.type === 'routine') {
      items.push(
        { label: 'Open',           icon: 'fi fi-rr-file-edit', action: () => this.clickNode(node) },
        { label: 'Rename',         icon: 'fi fi-rr-pencil' },
        { label: '', divider: true },
        // deleteRoutine no longer needs a MouseEvent — stale event bug fixed
        { label: 'Delete Routine', icon: 'fi fi-rr-trash', action: () => { if (node.routineId) this.deleteRoutine(node.routineId); } }
      );
    } else if (node.type === 'program') {
      items.push(
        { label: 'New Routine...', icon: 'fi fi-rr-file-add', action: () => { this.showNewRoutineModal = true; } },
        { label: 'Properties',     icon: 'fi fi-rr-settings' }
      );
    } else if (node.type === 'tags') {
      items.push(
        { label: 'Open Tag Database', icon: 'fi fi-rr-tags', action: () => this.nav.openTagsTab() },
        { label: 'New Tag...',        icon: 'fi fi-rr-add' }
      );
    } else if (node.type === 'controller') {
      items.push(
        { label: 'Controller Properties', icon: 'fi fi-rr-settings' },
        { label: '', divider: true },
        { label: 'Go Online', icon: 'fi fi-rr-play',  action: () => this.toggleEmulator() },
        { label: 'Verify',    icon: 'fi fi-rr-check', action: () => this.verifyProject() }
      );
    } else {
      items.push(
        { label: 'Expand All',   icon: 'fi fi-rr-expand',   action: () => { this.expandAll(); } },
        { label: 'Collapse All', icon: 'fi fi-rr-compress', action: () => { this.collapseAll(); } }
      );
    }
    this.contextMenu = { x: event.clientX, y: event.clientY, items };
  }

  public showTabContextMenu(event: MouseEvent, tab: EditorTab): void {
    event.preventDefault();
    this.contextMenu = {
      x: event.clientX, y: event.clientY,
      items: [
        { label: 'Close',        icon: 'fi fi-rr-cross',        action: () => this.nav.closeTab(tab.id) },
        { label: 'Close Others', icon: 'fi fi-rr-cross-circle', action: () => this.tabs.filter(t => t.id !== tab.id).forEach(t => this.nav.closeTab(t.id)) },
        { label: 'Close All',    icon: 'fi fi-rr-cross-small',  action: () => this.nav.closeAllTabs() },
        { label: '', divider: true },
        { label: 'Copy Path',          icon: 'fi fi-rr-copy' },
        { label: 'Reveal in Explorer', icon: 'fi fi-rr-list-check' }
      ]
    };
  }

  public showEditorContextMenu(event: MouseEvent): void {
    event.preventDefault();
    this.contextMenu = {
      x: event.clientX, y: event.clientY,
      items: [
        { label: 'Cut',   icon: 'fi fi-rr-scissors',  shortcut: 'Ctrl+X' },
        { label: 'Copy',  icon: 'fi fi-rr-copy',      shortcut: 'Ctrl+C' },
        { label: 'Paste', icon: 'fi fi-rr-clipboard', shortcut: 'Ctrl+V' },
        { label: '', divider: true },
        { label: 'Find',             icon: 'fi fi-rr-search',      shortcut: 'Ctrl+F' },
        { label: 'Go to Definition', icon: 'fi fi-rr-arrow-right' },
        { label: '', divider: true },
        { label: 'Verify Routine', icon: 'fi fi-rr-check', action: () => this.verifyProject() }
      ]
    };
  }

  public runContextAction(item: MenuAction): void {
    if (item.action) item.action();
    this.contextMenu = null;
  }

  // ── Menu Bar ──────────────────────────────────────────────────────────────

  public toggleMenu(label: string, event: MouseEvent): void {
    event.stopPropagation();
    this.activeMenu = this.activeMenu === label ? null : label;
    this.contextMenu = null;
  }

  public runMenuAction(item: MenuAction): void {
    if (item.divider || item.disabled) return;
    if (item.action) item.action();
    this.activeMenu = null;
  }

  @HostListener('document:click')
  onDocClick(): void { this.activeMenu = null; this.contextMenu = null; }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { this.activeMenu = null; this.contextMenu = null; }
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  public get currentTab(): EditorTab | undefined {
    return this.tabs.find(t => t.id === this.activeTabId);
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  public createNewRoutine(): void {
    const clean = this.newRoutineName.trim().replace(/\s+/g, '_');
    if (!clean || !this.project) return;
    const prog = this.project.tasks[0].programs[0];
    this.dataService.createRoutine(prog.id, clean, this.newRoutineLang, 'User created routine').subscribe(rtn => {
      if (!rtn) return;
      this.newRoutineName = '';
      this.showNewRoutineModal = false;
      this.nav.openRoutineTab(rtn.id, rtn.name, rtn.language, [this.project!.tasks[0].name, prog.name, rtn.name]);
    });
  }

  /** No MouseEvent parameter — stale event bug eliminated */
  public deleteRoutine(routineId: string): void {
    this.nav.closeTab(`tab-${routineId}`);
    this.dataService.deleteRoutine(routineId);
  }

  public toggleEmulator(): void {
    if (!this.project) return;
    this.dataService.toggleEmulation(!this.project.emulationRunning);
  }

  public verifyProject(): void {
    this.dataService.log('INFO', 'Compiler', 'Verifying project... 0 Errors, 0 Warnings.');
  }

  public deploySmartObject(so: SmartObject): void {
    const instName = `${so.name}_Inst_${Math.floor(Math.random() * 90 + 10)}`;
    this.dataService.instantiateSmartObject(so, instName).subscribe(rtn => {
      if (!rtn) return;
      this.nav.openRoutineTab(rtn.id, rtn.name, rtn.language, ['MainTask', 'Station04_Sequence', rtn.name]);
    });
  }

  public runCrossReference(): void {
    this.xrefHits = this.dataService.findTagCrossReferences(this.xrefTag);
  }

  public jumpToCrossRef(hit: CrossReferenceHit): void {
    this.nav.openRoutineTab(hit.routineId, hit.routineName, hit.language, ['MainTask', hit.programName, hit.routineName]);
  }

  public pushCommit(): void {
    const msg = this.commitMessage.trim() || 'chore(logic): sync controller workspace';
    this.dataService.commitToVault(msg);
    this.commitMessage = '';
  }

  public sendCopilot(): void {
    if (!this.copilotInput.trim()) return;
    this.dataService.log('INFO', 'Copilot', `Query: ${this.copilotInput}`);
    this.copilotInput = '';
  }

  public expandAll(): void {
    const addAll = (nodes: TreeNode[]) => nodes.forEach(n => { this.expandedNodes.add(n.id); if (n.children) addAll(n.children); });
    addAll(this.treeNodes);
    this.rebuildFlatNodes();
  }

  public collapseAll(): void {
    this.expandedNodes.clear();
    this.expandedNodes.add('ctrl-root');
    this.rebuildFlatNodes();
  }

  // ── Panel Resize ──────────────────────────────────────────────────────────

  public startResize(e: MouseEvent): void {
    this.resizing = true;
    this.resizeStartX = e.clientX;
    this.resizeStartW = this.leftPanelWidth;
    e.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.resizing) return;
    this.leftPanelWidth = Math.max(160, Math.min(480, this.resizeStartW + (e.clientX - this.resizeStartX)));
  }

  @HostListener('document:mouseup')
  onMouseUp(): void { this.resizing = false; }
}

import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { combineLatest } from 'rxjs';
import { LadderRung, PlcRoutine, ProjectModel } from '../../../core/models/plc.models';
import { WorkspaceDataService } from '../../../core/services/workspace-data.service';
import { NavigationHandlerService } from '../../../core/services/navigation-handler.service';
import { StCodeEditorComponent } from '../../../shared/components/st-code-editor/st-code-editor.component';
import { LadderEditorComponent } from '../../../shared/components/ladder-editor/ladder-editor.component';
import { FbdEditorComponent } from '../../../shared/components/fbd-editor/fbd-editor.component';

@Component({
  selector: 'ftds-routine-view',
  standalone: true,
  imports: [CommonModule, StCodeEditorComponent, LadderEditorComponent, FbdEditorComponent],
  templateUrl: './routine-view.component.html',
  styleUrls: ['./routine-view.component.scss']
})
export class RoutineViewComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  public project?: ProjectModel;
  public routine?: PlcRoutine;
  public draftCode = '';
  public tagNames: string[] = [];
  public showNeutralText = false;

  constructor(
    private route: ActivatedRoute,
    private dataService: WorkspaceDataService,
    private nav: NavigationHandlerService
  ) {}

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.dataService.project$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, project]) => {
        if (!project) return;
        this.project = project;
        this.tagNames = project.tags.map(t => t.name);
        const id = params.get('id');
        let found: PlcRoutine | undefined;
        for (const t of project.tasks)
          for (const p of t.programs) {
            const r = p.routines.find(x => x.id === id);
            if (r) found = r;
          }
        if (found) {
          const changedRoutine = this.routine?.id !== found.id;
          this.routine = found;
          if (changedRoutine || this.showNeutralText) {
            this.draftCode = found.stCode;
            if (changedRoutine) this.showNeutralText = false;
          }
        } else {
          this.routine = undefined;
        }
      });
  }

  public onCodeEdited(newCode: string): void {
    this.draftCode = newCode;
    if (this.routine) this.nav.markTabDirty(this.routine.id, newCode !== this.routine.stCode);
  }

  public saveStCode(): void {
    if (!this.routine) return;
    this.dataService.updateRoutineCode(this.routine.id, this.draftCode);
    this.nav.markTabDirty(this.routine.id, false);
  }

  public onRungsUpdated(rungs: LadderRung[]): void {
    if (!this.routine) return;
    this.dataService.updateRoutineRungs(this.routine.id, rungs);
  }

  public onToggleTag(tagName: string): void {
    if (!this.project) return;
    const tag = this.project.tags.find(t => t.name === tagName);
    if (tag && tag.dataType === 'BOOL') this.dataService.upsertTag({ ...tag, value: !tag.value });
  }
}

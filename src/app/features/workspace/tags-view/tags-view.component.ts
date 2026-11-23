import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlcTag, ProjectModel, TagDataType, TagScope, TagUsage } from '../../../core/models/plc.models';
import { WorkspaceDataService } from '../../../core/services/workspace-data.service';

@Component({
  selector: 'ftds-tags-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tags-view.component.html',
  styleUrls: ['./tags-view.component.scss']
})
export class TagsViewComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  public project?: ProjectModel;
  // Cached — updated only when project$ emits or filters change
  public cachedTags: PlcTag[] = [];

  public scopeFilter = 'ALL';
  public searchText = '';
  public newName = '';
  public newType: TagDataType = 'BOOL';
  public newScope: TagScope = 'Controller';

  constructor(private dataService: WorkspaceDataService) {}

  ngOnInit(): void {
    this.dataService.project$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => {
      if (p) { this.project = p; this.applyFilter(); }
    });
  }

  public applyFilter(): void {
    if (!this.project) { this.cachedTags = []; return; }
    const scope = this.scopeFilter;
    const search = this.searchText.toLowerCase();
    this.cachedTags = this.project.tags.filter(t => {
      const matchScope = scope === 'ALL' || t.scope === scope;
      const matchName  = !search || t.name.toLowerCase().includes(search);
      return matchScope && matchName;
    });
  }

  public toggleBool(tag: PlcTag): void {
    this.dataService.upsertTag({ ...tag, value: !tag.value });
  }

  public updateNumeric(tag: PlcTag, event: Event): void {
    this.dataService.upsertTag({ ...tag, value: Number((event.target as HTMLInputElement).value) });
  }

  public deleteTag(id: string): void {
    this.dataService.deleteTag(id);
  }

  public createTag(): void {
    const clean = this.newName.trim().replace(/\s+/g, '_');
    if (!clean || !this.project) return;
    const owner = this.newScope === 'Controller' ? this.project.controllerName
                : this.newScope === 'Program'    ? 'Station04_Sequence'
                : 'Main_Sequence_LD';
    this.dataService.upsertTag({
      id: '', name: clean, dataType: this.newType,
      scope: this.newScope, scopeOwner: owner,
      usage: 'Local' as TagUsage,
      value: this.newType === 'BOOL' ? false : 0,
      description: 'Created via Scoped Tag Database'
    });
    this.newName = '';
  }

  public trackByTagId(_: number, tag: PlcTag): string { return tag.id; }
}

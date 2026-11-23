import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectModel } from '../../../core/models/plc.models';
import { WorkspaceDataService } from '../../../core/services/workspace-data.service';

@Component({
  selector: 'ftds-udt-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './udt-view.component.html',
  styleUrls: ['./udt-view.component.scss']
})
export class UdtViewComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  public project?: ProjectModel;
  public newUdtName = '';
  public newUdtDesc = '';

  constructor(private dataService: WorkspaceDataService) {}

  ngOnInit(): void {
    this.dataService.project$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => {
      if (p) this.project = p;
    });
  }

  public createUdt(): void {
    const clean = this.newUdtName.trim().replace(/\s+/g, '_');
    if (!clean) return;
    this.dataService.addUdt({
      id: '',
      name: clean,
      description: this.newUdtDesc || 'Custom User-Defined Structure',
      members: [
        { name: 'Enable',     dataType: 'BOOL', description: 'Structure enable flag' },
        { name: 'StatusWord', dataType: 'DINT', description: 'Diagnostic status bits' }
      ]
    });
    this.newUdtName = '';
    this.newUdtDesc = '';
  }
}

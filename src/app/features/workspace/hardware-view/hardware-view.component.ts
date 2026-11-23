import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ProjectModel } from '../../../core/models/plc.models';
import { WorkspaceDataService } from '../../../core/services/workspace-data.service';

@Component({
  selector: 'ftds-hardware-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hardware-view.component.html',
  styleUrls: ['./hardware-view.component.scss']
})
export class HardwareViewComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  public project?: ProjectModel;

  constructor(private dataService: WorkspaceDataService) {}

  ngOnInit(): void {
    this.dataService.project$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(p => {
      if (p) this.project = p;
    });
  }
}

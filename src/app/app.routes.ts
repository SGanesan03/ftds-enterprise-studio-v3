import { Routes } from '@angular/router';
import { RoutineViewComponent } from './features/workspace/routine-view/routine-view.component';
import { TagsViewComponent } from './features/workspace/tags-view/tags-view.component';
import { HardwareViewComponent } from './features/workspace/hardware-view/hardware-view.component';
import { UdtViewComponent } from './features/workspace/udt-view/udt-view.component';

export const routes: Routes = [
  { path: '', redirectTo: 'workspace/routine/rtn-ld-main', pathMatch: 'full' },
  { path: 'workspace', redirectTo: 'workspace/routine/rtn-ld-main', pathMatch: 'full' },
  { path: 'workspace/empty', component: RoutineViewComponent },
  { path: 'workspace/routine/:id', component: RoutineViewComponent },
  { path: 'workspace/tags', component: TagsViewComponent },
  { path: 'workspace/hardware', component: HardwareViewComponent },
  { path: 'workspace/udts', component: UdtViewComponent },
  { path: '**', redirectTo: 'workspace/routine/rtn-ld-main' }
];

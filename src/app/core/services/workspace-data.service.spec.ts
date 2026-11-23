import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkspaceDataService } from './workspace-data.service';
import { ProjectModel } from '../models/plc.models';

describe('WorkspaceDataService', () => {
  let service: WorkspaceDataService;
  let httpMock: HttpTestingController;

  const mockDb: ProjectModel = {
    id: 'test-proj',
    name: 'Test_Cell',
    revision: '36.011',
    controllerName: 'Test_CPU',
    controllerCatalog: '1756-L84ES',
    branch: 'main',
    emulationRunning: true,
    scanTimeMs: 4.0,
    hardware: [],
    userDefinedTypes: [],
    tags: [
      { id: 't1', name: 'Master_EStop_Healthy', dataType: 'BOOL', scope: 'Controller', scopeOwner: 'Test_CPU', usage: 'Input', value: true, description: '' },
      { id: 't2', name: 'Safety_LightCurtain_OK', dataType: 'BOOL', scope: 'Controller', scopeOwner: 'Test_CPU', usage: 'Input', value: true, description: '' },
      { id: 't3', name: 'Auto_Cycle_Start_PB', dataType: 'BOOL', scope: 'Controller', scopeOwner: 'Test_CPU', usage: 'Input', value: true, description: '' },
      { id: 't4', name: 'Cycle_Stop_PB', dataType: 'BOOL', scope: 'Controller', scopeOwner: 'Test_CPU', usage: 'Input', value: false, description: '' },
      { id: 't5', name: 'Infeed_Conveyor_Run', dataType: 'BOOL', scope: 'Controller', scopeOwner: 'Test_CPU', usage: 'Output', value: false, description: '' }
    ],
    tasks: [],
    smartObjects: [],
    commits: []
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [WorkspaceDataService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(WorkspaceDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load JSON database and evaluate Soft-PLC logic', () => {
    const req = httpMock.expectOne('assets/data/ftds-workspace-db.json');
    req.flush(mockDb);

    let loaded: ProjectModel | null = null;
    service.project$.subscribe(p => (loaded = p));
    expect(loaded).toBeTruthy();
    const convTag = loaded!.tags.find(t => t.name === 'Infeed_Conveyor_Run');
    expect(convTag?.value).toBeTrue();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FbdEditorComponent } from './fbd-editor.component';

describe('FbdEditorComponent', () => {
  let component: FbdEditorComponent;
  let fixture: ComponentFixture<FbdEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FbdEditorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FbdEditorComponent);
    component = fixture.componentInstance;
    component.nodes = [
      { id: 'a', type: 'INPUT_REF', label: 'In1', tagRef: 'TagA', x: 0, y: 0, state: true },
      { id: 'b', type: 'OUTPUT_REF', label: 'Out1', x: 200, y: 0, state: true }
    ];
    component.wires = [{ id: 'w1', fromNodeId: 'a', toNodeId: 'b', active: true }];
    fixture.detectChanges();
  });

  it('should compute valid SVG cubic bezier path between connected nodes', () => {
    const path = component.computeWirePath(component.wires[0]);
    expect(path).toContain('M 178 27');
  });
});

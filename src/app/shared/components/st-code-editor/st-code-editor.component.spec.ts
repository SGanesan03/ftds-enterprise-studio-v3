import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StCodeEditorComponent } from './st-code-editor.component';

describe('StCodeEditorComponent', () => {
  let component: StCodeEditorComponent;
  let fixture: ComponentFixture<StCodeEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StCodeEditorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StCodeEditorComponent);
    component = fixture.componentInstance;
    component.code = 'IF Master_EStop_Healthy THEN\n    Infeed_Conveyor_Run := TRUE;\nEND_IF;';
    component.ngOnChanges();
    fixture.detectChanges();
  });

  it('should compute line numbers and emit code updates', () => {
    expect(component.lineCount).toBe(3);
    spyOn(component.codeChange, 'emit');
    component.onTextChange('RETURN;');
    expect(component.codeChange.emit).toHaveBeenCalledWith('RETURN;');
  });
});

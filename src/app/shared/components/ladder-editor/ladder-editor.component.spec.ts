import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LadderEditorComponent } from './ladder-editor.component';

describe('LadderEditorComponent', () => {
  let component: LadderEditorComponent;
  let fixture: ComponentFixture<LadderEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LadderEditorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LadderEditorComponent);
    component = fixture.componentInstance;
    component.rungs = [];
    fixture.detectChanges();
  });

  it('should emit a newly added rung', () => {
    spyOn(component.rungsChange, 'emit');
    component.addRung();
    expect(component.rungsChange.emit).toHaveBeenCalled();
  });
});

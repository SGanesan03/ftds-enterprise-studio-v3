import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { RoutineViewComponent } from './routine-view.component';

describe('RoutineViewComponent', () => {
  let component: RoutineViewComponent;
  let fixture: ComponentFixture<RoutineViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoutineViewComponent],
      providers: [provideRouter([]), provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(RoutineViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create routine view component', () => {
    expect(component).toBeTruthy();
  });
});

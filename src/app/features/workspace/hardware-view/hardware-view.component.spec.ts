import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HardwareViewComponent } from './hardware-view.component';

describe('HardwareViewComponent', () => {
  let component: HardwareViewComponent;
  let fixture: ComponentFixture<HardwareViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HardwareViewComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(HardwareViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create hardware view component', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { UdtViewComponent } from './udt-view.component';

describe('UdtViewComponent', () => {
  let component: UdtViewComponent;
  let fixture: ComponentFixture<UdtViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UdtViewComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(UdtViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create UDT view component', () => {
    expect(component).toBeTruthy();
  });
});

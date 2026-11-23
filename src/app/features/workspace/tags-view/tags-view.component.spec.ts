import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { TagsViewComponent } from './tags-view.component';

describe('TagsViewComponent', () => {
  let component: TagsViewComponent;
  let fixture: ComponentFixture<TagsViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TagsViewComponent],
      providers: [provideHttpClient()]
    }).compileComponents();

    fixture = TestBed.createComponent(TagsViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create tags view component', () => {
    expect(component).toBeTruthy();
  });
});

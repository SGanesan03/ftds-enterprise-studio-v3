import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NavigationHandlerService } from './navigation-handler.service';

describe('NavigationHandlerService', () => {
  let service: NavigationHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NavigationHandlerService, provideRouter([])]
    });
    service = TestBed.inject(NavigationHandlerService);
  });

  it('should open and close editor tabs cleanly', async () => {
    // Starts empty — no hardcoded initial tabs
    let count = await firstValueFrom(service.tabs$);
    expect(count.length).toBe(0);

    service.openTagsTab();
    count = await firstValueFrom(service.tabs$);
    expect(count.length).toBe(1);

    service.closeTab('tab-tags-matrix');
    count = await firstValueFrom(service.tabs$);
    expect(count.length).toBe(0);
  });

  it('closeAllTabs should clear all tabs in a single emission', async () => {
    service.openTagsTab();
    service.openHardwareTab();
    service.closeAllTabs();
    const tabs = await firstValueFrom(service.tabs$);
    expect(tabs.length).toBe(0);
  });
});

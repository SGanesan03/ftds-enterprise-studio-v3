import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { RoutineLanguage } from '../models/plc.models';

export type SidebarSection = 'EXPLORER' | 'SMART_OBJECTS' | 'GIT_VAULT' | 'CROSS_REF' | 'JSON_INSPECTOR';

export interface EditorTab {
  id: string;
  title: string;
  type: 'ROUTINE' | 'TAGS_GRID' | 'HARDWARE_CONFIG' | 'UDT_DESIGNER';
  routineId?: string;
  language?: RoutineLanguage;
  breadcrumb: string[];
  isDirty?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NavigationHandlerService {
  private readonly activeSidebarSubject = new BehaviorSubject<SidebarSection>('EXPLORER');
  public readonly activeSidebar$ = this.activeSidebarSubject.asObservable();

  // Start with empty tabs — AppComponent opens first routine after project$ emits
  private readonly tabsSubject = new BehaviorSubject<EditorTab[]>([]);
  public readonly tabs$ = this.tabsSubject.asObservable();

  private readonly activeTabIdSubject = new BehaviorSubject<string>('');
  public readonly activeTabId$ = this.activeTabIdSubject.asObservable();

  private readonly bottomPanelOpenSubject = new BehaviorSubject<boolean>(true);
  public readonly bottomPanelOpen$ = this.bottomPanelOpenSubject.asObservable();

  constructor(private router: Router) {}

  public setSidebarSection(section: SidebarSection): void {
    this.activeSidebarSubject.next(section);
  }

  public toggleBottomPanel(): void {
    this.bottomPanelOpenSubject.next(!this.bottomPanelOpenSubject.getValue());
  }

  public openRoutineTab(routineId: string, title: string, language: RoutineLanguage, breadcrumb: string[]): void {
    const tabId = `tab-${routineId}`;
    const existing = this.tabsSubject.getValue();
    if (!existing.some(t => t.id === tabId)) {
      this.tabsSubject.next([...existing, { id: tabId, title, type: 'ROUTINE', routineId, language, breadcrumb }]);
    }
    this.activateTab(tabId);
  }

  public openTagsTab(): void {
    this.openStaticTab('tab-tags-matrix', 'Controller & Program Tags', 'TAGS_GRID',
      ['Cell04_GuardLogix_5580', 'Scoped Tag Database']);
  }

  public openHardwareTab(): void {
    this.openStaticTab('tab-hw-chassis', '1756 Backplane Chassis', 'HARDWARE_CONFIG',
      ['System Model', 'Hardware', '1756 ControlLogix Rack']);
  }

  public openUdtTab(): void {
    this.openStaticTab('tab-udt-designer', 'User-Defined Types (UDTs)', 'UDT_DESIGNER',
      ['Data Types', 'User-Defined Structures']);
  }

  private openStaticTab(id: string, title: string, type: EditorTab['type'], breadcrumb: string[]): void {
    const existing = this.tabsSubject.getValue();
    if (!existing.some(t => t.id === id)) {
      this.tabsSubject.next([...existing, { id, title, type, breadcrumb }]);
    }
    this.activateTab(id);
  }

  public activateTab(tabId: string): void {
    this.activeTabIdSubject.next(tabId);
    const tab = this.tabsSubject.getValue().find(t => t.id === tabId);
    if (!tab) return;
    if (tab.type === 'ROUTINE' && tab.routineId) {
      this.router.navigate(['/workspace/routine', tab.routineId]);
    } else if (tab.type === 'TAGS_GRID') {
      this.router.navigate(['/workspace/tags']);
    } else if (tab.type === 'HARDWARE_CONFIG') {
      this.router.navigate(['/workspace/hardware']);
    } else if (tab.type === 'UDT_DESIGNER') {
      this.router.navigate(['/workspace/udts']);
    }
  }

  public closeTab(tabId: string, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    const current = this.tabsSubject.getValue();
    const filtered = current.filter(t => t.id !== tabId);
    this.tabsSubject.next(filtered);
    if (this.activeTabIdSubject.getValue() === tabId) {
      const fallback = filtered[filtered.length - 1];
      if (fallback) {
        this.activateTab(fallback.id);
      } else {
        this.activeTabIdSubject.next('');
        this.router.navigate(['/workspace/empty']);
      }
    }
  }

  /** Close all tabs in a single BehaviorSubject emission — avoids cascading closeTab() calls */
  public closeAllTabs(): void {
    this.tabsSubject.next([]);
    this.activeTabIdSubject.next('');
    this.router.navigate(['/workspace/empty']);
  }

  public markTabDirty(routineId: string, isDirty: boolean): void {
    const updated = this.tabsSubject.getValue().map(t =>
      t.routineId === routineId ? { ...t, isDirty } : t
    );
    this.tabsSubject.next(updated);
  }

  // trackBy helpers exposed for templates
  public trackByTabId(_: number, tab: EditorTab): string { return tab.id; }
}

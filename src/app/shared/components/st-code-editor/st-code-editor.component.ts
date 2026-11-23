import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'ftds-st-code-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './st-code-editor.component.html',
  styleUrls: ['./st-code-editor.component.scss']
})
export class StCodeEditorComponent implements OnChanges, OnDestroy {
  @Input() code = '';
  @Input() tagSuggestions: string[] = [];
  @Output() codeChange = new EventEmitter<string>();
  @Output() saveRequested = new EventEmitter<string>();

  public lineNumbers: number[] = [1];
  public lineCount = 1;
  // SafeHtml — bypasses sanitizer so <span class="tok-*"> survive intact
  public highlightedHtml: SafeHtml = '';

  private readonly highlightSubject = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(private sanitizer: DomSanitizer) {
    // Debounce syntax highlighting — avoids blocking on every keystroke
    this.highlightSubject.pipe(
      debounceTime(150),
      takeUntil(this.destroy$)
    ).subscribe(text => this.applyHighlight(text));
  }

  ngOnChanges(): void {
    this.updateLineNumbers(this.code || '');
    this.highlightSubject.next(this.code || '');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public onTextChange(val: string): void {
    this.code = val;
    this.updateLineNumbers(val);
    this.highlightSubject.next(val);
    this.codeChange.emit(val);
  }

  public syncScroll(textarea: HTMLTextAreaElement, pre: HTMLElement, gutter: HTMLElement): void {
    pre.scrollTop = textarea.scrollTop;
    pre.scrollLeft = textarea.scrollLeft;
    gutter.scrollTop = textarea.scrollTop;
  }

  public insertTag(tagName: string): void {
    if (!tagName) return;
    this.onTextChange((this.code || '') + `\n    // Tag Ref: ${tagName}`);
  }

  public onKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.saveRequested.emit(this.code);
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const target = event.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const updated = this.code.substring(0, start) + '    ' + this.code.substring(end);
      this.onTextChange(updated);
      setTimeout(() => { target.selectionStart = target.selectionEnd = start + 4; });
    }
  }

  private updateLineNumbers(text: string): void {
    const count = text.split('\n').length;
    this.lineCount = count;
    this.lineNumbers = Array.from({ length: Math.max(count, 30) }, (_, i) => i + 1);
  }

  private applyHighlight(text: string): void {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const highlighted = escaped
      .replace(/(\/\/.*$)/gm,                '<span class="tok-comment">$1</span>')
      .replace(/\b(IF|THEN|ELSE|ELSIF|END_IF|FOR|TO|DO|END_FOR|WHILE|END_WHILE|CASE|OF|END_CASE|RETURN|REGION|END_REGION|AND|OR|NOT)\b/g,
               '<span class="tok-kw">$1</span>')
      .replace(/\b(BOOL|DINT|REAL|TIMER|STRING)\b/g, '<span class="tok-type">$1</span>')
      .replace(/\b(TRUE|FALSE)\b/g,                  '<span class="tok-bool">$1</span>')
      .replace(/\b(\d+(\.\d+)?)\b/g,                 '<span class="tok-num">$1</span>');

    // bypassSecurityTrustHtml is safe here: input is fully HTML-escaped before regex runs,
    // so no raw user HTML can reach the DOM — only our own controlled <span> tags are injected.
    this.highlightedHtml = this.sanitizer.bypassSecurityTrustHtml(highlighted + '\n');
  }
}

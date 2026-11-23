import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LadderInstruction, LadderRung, PlcTag } from '../../../core/models/plc.models';

@Component({
  selector: 'ftds-ladder-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ladder-editor.component.html',
  styleUrls: ['./ladder-editor.component.scss']
})
export class LadderEditorComponent {
  @Input() rungs: LadderRung[] = [];
  @Input() tags: PlcTag[] = [];
  @Output() rungsChange = new EventEmitter<LadderRung[]>();
  @Output() toggleTag = new EventEmitter<string>();

  public selectedRungIndex = 0;
  public zoom = 110;
  public ldMode = 'select';
  public Math = Math;

  public isTagTrue(operand: string): boolean {
    return Boolean(this.tags.find(x => x.name === operand)?.value);
  }

  public getScopePath(operand: string): string {
    const tag = this.tags.find(x => x.name === operand);
    if (!tag) return '';
    return `${tag.scopeOwner}.${operand}`;
  }

  public toggleOperandTag(operand: string, event: MouseEvent): void {
    event.stopPropagation();
    this.toggleTag.emit(operand);
  }

  public addRung(): void {
    const cloned = structuredClone(this.rungs);
    cloned.push({
      id: crypto.randomUUID(),
      number: cloned.length,
      comment: 'User-defined control rung',
      powerFlowActive: false,
      instructions: [
        { id: crypto.randomUUID(), opcode: 'XIC', operand: this.tags[0]?.name || 'Master_EStop_Healthy', branch: 'MAIN' },
        { id: crypto.randomUUID(), opcode: 'OTE', operand: this.tags[4]?.name || 'Infeed_Conveyor_Run', branch: 'MAIN' }
      ]
    });
    this.selectedRungIndex = cloned.length - 1;
    this.rungsChange.emit(cloned);
  }

  public deleteRung(idx: number, event: MouseEvent): void {
    event.stopPropagation();
    const cloned = structuredClone(this.rungs);
    cloned.splice(idx, 1);
    cloned.forEach((r, i) => (r.number = i));
    this.selectedRungIndex = Math.max(0, Math.min(this.selectedRungIndex, cloned.length - 1));
    this.rungsChange.emit(cloned);
  }

  public addInstruction(opcode: LadderInstruction['opcode']): void {
    if (!this.rungs.length) { this.addRung(); return; }
    const cloned = structuredClone(this.rungs);
    const target = cloned[this.selectedRungIndex] || cloned[0];
    target.instructions.push({
      id: crypto.randomUUID(),
      opcode,
      operand: this.tags[0]?.name || 'Master_EStop_Healthy',
      presetMs: opcode === 'TON' ? 300 : undefined,
      branch: 'MAIN'
    });
    this.rungsChange.emit(cloned);
  }

  public changeOperand(rungIdx: number, instIdx: number, newOperand: string): void {
    const cloned = structuredClone(this.rungs);
    cloned[rungIdx].instructions[instIdx].operand = newOperand;
    this.rungsChange.emit(cloned);
  }

  public removeInstruction(rungIdx: number, instIdx: number, event: MouseEvent): void {
    event.stopPropagation();
    const cloned = structuredClone(this.rungs);
    cloned[rungIdx].instructions.splice(instIdx, 1);
    this.rungsChange.emit(cloned);
  }
}

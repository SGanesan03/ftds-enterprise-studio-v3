import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FbdNode, FbdWire } from '../../../core/models/plc.models';

@Component({
  selector: 'ftds-fbd-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fbd-editor.component.html',
  styleUrls: ['./fbd-editor.component.scss']
})
export class FbdEditorComponent {
  @Input() nodes: FbdNode[] = [];
  @Input() wires: FbdWire[] = [];
  @Output() toggleTag = new EventEmitter<string>();

  public computeWirePath(wire: FbdWire): string {
    const from = this.nodes.find(n => n.id === wire.fromNodeId);
    const to   = this.nodes.find(n => n.id === wire.toNodeId);
    if (!from || !to) return '';
    const x1 = from.x + 180, y1 = from.y + 28;
    const x2 = to.x,         y2 = to.y + 28;
    const cx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
  }

  public getWireMidX(wire: FbdWire): number {
    const from = this.nodes.find(n => n.id === wire.fromNodeId);
    const to   = this.nodes.find(n => n.id === wire.toNodeId);
    if (!from || !to) return 0;
    return (from.x + 180 + to.x) / 2;
  }

  public getWireMidY(wire: FbdWire): number {
    const from = this.nodes.find(n => n.id === wire.fromNodeId);
    const to   = this.nodes.find(n => n.id === wire.toNodeId);
    if (!from || !to) return 0;
    return (from.y + 28 + to.y + 28) / 2;
  }

  public onNodeClick(node: FbdNode): void {
    if (node.tagRef) this.toggleTag.emit(node.tagRef);
  }
}

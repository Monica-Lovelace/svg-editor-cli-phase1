import { UndoableCommand } from './UndoableCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class MoveCommand extends UndoableCommand {
  constructor(private readonly id: string, private readonly dx: number, private readonly dy: number) { super(); }
  protected override edit(document: SvgDocument): string {
    const shape = document.find(this.id); shape.move(this.dx, this.dy);
    return `${shape.label} moved by (${this.dx},${this.dy})${shape.geometrySummary ? `: ${shape.geometrySummary}` : ''}`;
  }
}

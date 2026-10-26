import { UndoableCommand } from './UndoableCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class ScaleCommand extends UndoableCommand {
  constructor(private readonly id: string, private readonly factor: number) { super(); }
  protected override edit(document: SvgDocument): string {
    const shape = document.find(this.id); shape.scale(this.factor);
    return `${shape.label} scaled by ${this.factor}`;
  }
}

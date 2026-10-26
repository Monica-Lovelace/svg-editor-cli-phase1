import { UndoableCommand } from './UndoableCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class SetCommand extends UndoableCommand {
  constructor(private readonly id: string, private readonly attribute: string, private readonly value: string) { super(); }
  protected override edit(document: SvgDocument): string {
    const shape = document.find(this.id); shape.setAttribute(this.attribute, this.value);
    return `${shape.label} updated: ${this.attribute}=${JSON.stringify(this.value)}`;
  }
}

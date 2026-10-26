import { UndoableCommand } from './UndoableCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class FrontCommand extends UndoableCommand {
  constructor(private readonly id: string) { super(); }
  protected override edit(document: SvgDocument): string { document.reorder(this.id, true); return `${document.find(this.id).label} brought to front`; }
}

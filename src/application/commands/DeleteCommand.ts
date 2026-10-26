import { UndoableCommand } from './UndoableCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class DeleteCommand extends UndoableCommand {
  constructor(private readonly id: string) { super(); }
  protected override edit(document: SvgDocument): string { return `${document.delete(this.id).label} deleted`; }
}

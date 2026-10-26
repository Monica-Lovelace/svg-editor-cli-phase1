import { UndoableCommand } from './UndoableCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class BackCommand extends UndoableCommand {
  constructor(private readonly id: string) { super(); }
  protected override edit(document: SvgDocument): string { document.reorder(this.id, false); return `${document.find(this.id).label} sent to back`; }
}

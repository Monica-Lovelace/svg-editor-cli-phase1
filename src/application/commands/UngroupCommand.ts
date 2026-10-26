import { UndoableCommand } from './UndoableCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class UngroupCommand extends UndoableCommand {
  constructor(private readonly id: string) { super(); }
  protected override edit(document: SvgDocument): string { document.ungroup(this.id); return `g#${this.id} ungrouped`; }
}

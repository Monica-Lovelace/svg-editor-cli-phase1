import { UndoableCommand } from './UndoableCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class GroupCommand extends UndoableCommand {
  constructor(private readonly id: string, private readonly targets: readonly string[]) { super(); }
  protected override edit(document: SvgDocument): string {
    const group = document.group(this.id, this.targets);
    return `${group.label} created with ${group.children.length} children`;
  }
}

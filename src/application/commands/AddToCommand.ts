import { UndoableCommand } from './UndoableCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';

export class AddToCommand extends UndoableCommand {
  constructor(private readonly groupId: string, private readonly id: string) { super(); }
  protected override edit(document: SvgDocument): string {
    const label = document.find(this.id).label; document.addTo(this.groupId, this.id);
    return `${label} moved into g#${this.groupId}`;
  }
}

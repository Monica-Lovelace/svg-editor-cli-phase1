import { UndoableCommand } from './UndoableCommand.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { ShapeFactory } from '../../domain/ShapeFactory.js';

export class CreateCommand extends UndoableCommand {
  constructor(private readonly factory: ShapeFactory, private readonly type: string, private readonly id: string, private readonly params: readonly string[], private readonly parentId?: string) { super(); }
  protected override edit(document: SvgDocument): string {
    const shape = this.factory.create(this.type, this.id, this.params);
    document.add(shape, this.parentId);
    return `${shape.label} created${this.parentId === undefined ? '' : ` in g#${this.parentId}`}`;
  }
}

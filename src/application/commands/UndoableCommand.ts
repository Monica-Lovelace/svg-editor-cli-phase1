import type { Command } from './Command.js';
import type { EditorSession } from '../EditorSession.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { DocumentMemento } from '../../domain/DocumentMemento.js';
import { EditorError } from '../../domain/EditorError.js';

export abstract class UndoableCommand implements Command {
  #before?: DocumentMemento;
  #after?: DocumentMemento;
  #result = '';

  async execute(session: EditorSession): Promise<readonly string[]> {
    const original = session.document;
    const candidate = original.clone();
    const result = this.edit(candidate);
    candidate.assertValid();
    // Capture both states before committing. Any validation/snapshot failure leaves the session untouched.
    const before = new DocumentMemento(original);
    const after = new DocumentMemento(candidate);
    this.#before = before; this.#after = after; this.#result = result;
    session.replaceDocument(candidate); session.history.record(this);
    return [result];
  }

  undo(session: EditorSession): string {
    if (!this.#before) throw new EditorError('command has not executed');
    session.replaceDocument(this.#before.restore());
    return `undone: ${this.#result}`;
  }

  redo(session: EditorSession): string {
    if (!this.#after) throw new EditorError('command has not executed');
    session.replaceDocument(this.#after.restore());
    return `redone: ${this.#result}`;
  }

  protected abstract edit(document: SvgDocument): string;
}

import type { UndoableCommand } from './commands/UndoableCommand.js';
import type { EditorSession } from './EditorSession.js';
import { EditorError } from '../domain/EditorError.js';

export class HistoryManager {
  #undo: UndoableCommand[] = [];
  #redo: UndoableCommand[] = [];
  #blocked = false;

  barrier(): void { this.#undo = []; this.#redo = []; this.#blocked = true; }
  record(command: UndoableCommand): void { this.#undo.push(command); this.#redo = []; this.#blocked = false; }

  undo(session: EditorSession): string {
    this.requireAllowed();
    const command = this.#undo.at(-1);
    if (!command) throw new EditorError('nothing to undo');
    const result = command.undo(session);
    this.#undo.pop(); this.#redo.push(command); return result;
  }

  redo(session: EditorSession): string {
    this.requireAllowed();
    const command = this.#redo.at(-1);
    if (!command) throw new EditorError('nothing to redo');
    const result = command.redo(session);
    this.#redo.pop(); this.#undo.push(command); return result;
  }

  private requireAllowed(): void {
    if (this.#blocked) throw new EditorError('undo not allowed after io command');
  }
}

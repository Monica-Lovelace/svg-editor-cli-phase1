import type { Command } from './Command.js';
import type { EditorSession } from '../EditorSession.js';

export class UndoCommand implements Command {
  async execute(session: EditorSession): Promise<readonly string[]> {
    void session.document; return [session.history.undo(session)];
  }
}

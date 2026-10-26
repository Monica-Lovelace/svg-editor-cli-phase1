import type { Command } from './Command.js';
import type { EditorSession } from '../EditorSession.js';

export class ReadCommand implements Command {
  constructor(private readonly path: string) {}
  async execute(session: EditorSession): Promise<readonly string[]> {
    return session.read(this.path);
  }
}

import type { Command } from './Command.js';
import type { EditorSession } from '../EditorSession.js';

export class SaveCommand implements Command {
  constructor(private readonly path?: string) {}
  async execute(session: EditorSession): Promise<readonly string[]> {
    return [await session.save(this.path)];
  }
}

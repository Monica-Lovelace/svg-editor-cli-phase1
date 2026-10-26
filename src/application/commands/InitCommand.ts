import type { Command } from './Command.js';
import type { EditorSession } from '../EditorSession.js';

export class InitCommand implements Command {
  constructor(private readonly width: number, private readonly height: number) {}
  async execute(session: EditorSession): Promise<readonly string[]> {
    return [session.init(this.width, this.height)];
  }
}

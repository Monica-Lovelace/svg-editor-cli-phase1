import type { Command } from './Command.js';
import type { EditorSession } from '../EditorSession.js';

export class CanvasCommand implements Command {
  constructor(private readonly width?: number, private readonly height?: number) {}
  async execute(session: EditorSession): Promise<readonly string[]> {
    if (this.width === undefined) return [`canvas ${session.document.width}x${session.document.height}`];
    return [session.resize(this.width, this.height!)];
  }
}

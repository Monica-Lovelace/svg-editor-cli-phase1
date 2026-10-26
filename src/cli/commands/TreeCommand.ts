import type { Command } from '../../application/commands/Command.js';
import type { EditorSession } from '../../application/EditorSession.js';
import { TreeRenderer } from '../TreeRenderer.js';

export class TreeCommand implements Command {
  constructor(private readonly id?: string) {}
  async execute(session: EditorSession): Promise<readonly string[]> { return [new TreeRenderer().render(session.document, this.id)]; }
}

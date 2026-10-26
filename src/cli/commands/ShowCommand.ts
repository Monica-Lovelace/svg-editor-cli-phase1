import type { Command } from '../../application/commands/Command.js';
import type { EditorSession } from '../../application/EditorSession.js';
import { ShapeInspector } from '../ShapeInspector.js';

export class ShowCommand implements Command {
  constructor(private readonly id: string) {}
  async execute(session: EditorSession): Promise<readonly string[]> { return [new ShapeInspector().render(session.document, this.id)]; }
}

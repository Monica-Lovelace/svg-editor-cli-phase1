import type { Command } from '../../application/commands/Command.js';

export class HelpCommand implements Command {
  constructor(private readonly text: string) {}
  async execute(): Promise<readonly string[]> { return [this.text]; }
}

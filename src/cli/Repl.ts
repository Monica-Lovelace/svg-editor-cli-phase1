import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { CommandDispatcher } from './CommandDispatcher.js';
import type { EditorSession } from '../application/EditorSession.js';

export class Repl {
  constructor(private readonly session: EditorSession, private readonly dispatcher = new CommandDispatcher()) {}

  async evaluate(line: string): Promise<readonly string[]> {
    try { return await this.dispatcher.parse(line)?.execute(this.session) ?? []; }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [`error: ${message.replace(/[\r\n]+/g, ' ')}`];
    }
  }

  async run(input: Readable & { isTTY?: boolean }, output: Writable): Promise<void> {
    const terminal = Boolean(input.isTTY);
    const reader = createInterface({ input, output, terminal, crlfDelay: Infinity });
    output.write("svg-editor 0.1 — type 'help' for commands\n");
    if (terminal) { reader.setPrompt('svg> '); reader.prompt(); }
    for await (const line of reader) {
      for (const message of await this.evaluate(line)) output.write(message + '\n');
      if (terminal) reader.prompt();
    }
  }
}

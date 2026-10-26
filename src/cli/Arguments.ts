import { EditorError } from '../domain/EditorError.js';
import { Numeric } from '../domain/Numeric.js';
import type { Token } from './Tokenizer.js';

export class Arguments {
  constructor(readonly tokens: readonly Token[]) {}
  count(...allowed: number[]): this {
    if (!allowed.includes(this.tokens.length)) throw new EditorError("invalid argument count; use 'help' for syntax");
    return this;
  }
  atLeast(count: number): this {
    if (this.tokens.length < count) throw new EditorError("not enough arguments; use 'help' for syntax");
    return this;
  }
  string(index: number): string {
    const token = this.tokens[index];
    if (!token) throw new EditorError('missing argument');
    return token.value;
  }
  number(index: number, name: string): number { return Numeric.parse(this.string(index), name); }
  get values(): readonly string[] { return this.tokens.map(token => token.value); }
}

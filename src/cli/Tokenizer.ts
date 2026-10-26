import { EditorError } from '../domain/EditorError.js';

export interface Token { readonly value: string; readonly quoted: boolean }

export class Tokenizer {
  tokenize(line: string): readonly Token[] {
    if (line.trimStart().startsWith('#')) return [];
    const tokens: Token[] = [];
    let index = 0;
    while (index < line.length) {
      while (/\s/u.test(line[index] ?? '') && index < line.length) index++;
      if (index >= line.length) break;
      const quoted = line[index] === '"';
      let value = '';
      if (quoted) {
        index++;
        while (index < line.length && line[index] !== '"') {
          if (line[index] === '\\' && ['"', '\\'].includes(line[index + 1] ?? '')) index++;
          value += line[index++];
        }
        if (index >= line.length) throw new EditorError('unterminated double quote');
        index++;
        if (index < line.length && !/\s/u.test(line[index]!)) throw new EditorError('expected whitespace after quoted argument');
      } else {
        while (index < line.length && !/\s/u.test(line[index]!)) {
          if (line[index] === '"') throw new EditorError('double quote must start an argument');
          value += line[index++];
        }
      }
      tokens.push(Object.freeze({ value, quoted }));
    }
    return tokens;
  }
}

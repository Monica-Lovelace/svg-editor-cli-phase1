import { readFile, writeFile, rename, unlink, lstat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { DocumentStore } from '../application/ports/DocumentStore.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { EditorError } from '../domain/EditorError.js';
import { SvgReader } from './SvgReader.js';
import { SvgWriter } from './SvgWriter.js';

export class NodeDocumentStore implements DocumentStore {
  constructor(private readonly reader = new SvgReader(), private readonly writer = new SvgWriter()) {}

  async read(path: string): Promise<{ document: SvgDocument; warnings: readonly string[] }> {
    let source: string;
    try { source = await readFile(path, 'utf8'); }
    catch { throw new EditorError(`cannot read file: ${path}`); }
    return this.reader.parse(source);
  }

  async write(path: string, document: SvgDocument): Promise<void> {
    const source = this.writer.serialize(document);
    const temporary = join(dirname(path), `.svg-editor-${randomUUID()}.tmp`);
    try {
      const existing = await lstat(path).catch((error: NodeJS.ErrnoException) => { if (error.code === 'ENOENT') return undefined; throw error; });
      if (existing && (!existing.isFile() || (existing.mode & 0o222) === 0)) throw new Error('destination is not writable');
      await writeFile(temporary, source, { encoding: 'utf8', flag: 'wx', mode: existing ? existing.mode & 0o777 : 0o644 });
      await rename(temporary, path);
    } catch {
      await unlink(temporary).catch(() => undefined);
      throw new EditorError(`cannot write file: ${path}`);
    }
  }
}

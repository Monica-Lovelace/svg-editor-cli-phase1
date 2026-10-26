import type { DocumentStore } from '../src/application/ports/DocumentStore.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { EditorError } from '../src/domain/EditorError.js';

export class MemoryDocumentStore implements DocumentStore {
  readonly files = new Map<string, SvgDocument>();
  async read(path: string): Promise<{ document: SvgDocument; warnings: readonly string[] }> {
    const document = this.files.get(path);
    if (!document) throw new EditorError(`cannot read file: ${path}`);
    return { document: document.clone(), warnings: [] };
  }
  async write(path: string, document: SvgDocument): Promise<void> {
    if (path === 'unwritable.svg') throw new EditorError(`cannot write file: ${path}`);
    this.files.set(path, document.clone());
  }
}

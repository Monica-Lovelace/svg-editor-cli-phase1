import { SvgDocument } from '../domain/SvgDocument.js';
import { EditorError } from '../domain/EditorError.js';
import { HistoryManager } from './HistoryManager.js';
import type { DocumentStore } from './ports/DocumentStore.js';

export class EditorSession {
  #document: SvgDocument | undefined;
  #path: string | undefined;
  readonly history = new HistoryManager();
  constructor(readonly store: DocumentStore) {}

  get document(): SvgDocument {
    if (!this.#document) throw new EditorError("no document. use 'init' or 'read' first");
    return this.#document;
  }
  get path(): string | undefined { return this.#path; }

  replaceDocument(document: SvgDocument): void { this.#document = document; }

  init(width: number, height: number): string {
    const document = new SvgDocument(width, height);
    this.#document = document; this.#path = undefined; this.history.barrier();
    return `canvas ${width}x${height} created`;
  }

  async read(path: string): Promise<readonly string[]> {
    const result = await this.store.read(path);
    result.document.assertValid();
    this.#document = result.document; this.#path = path; this.history.barrier();
    return [...result.warnings, `read ${path} (${result.document.count} elements)`];
  }

  async save(path?: string): Promise<string> {
    const document = this.document;
    const target = path ?? this.#path;
    if (target === undefined) throw new EditorError('no save path. use save <file.svg>');
    await this.store.write(target, document);
    this.#path = target; this.history.barrier();
    return `saved to ${target} (${document.count} elements)`;
  }

  resize(width: number, height: number): string {
    const next = this.document.clone(); next.resize(width, height);
    this.#document = next; this.history.barrier();
    return `canvas resized to ${width}x${height}`;
  }
}

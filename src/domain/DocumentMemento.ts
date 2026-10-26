import { SvgDocument } from './SvgDocument.js';

export class DocumentMemento {
  readonly #state: SvgDocument;
  constructor(document: SvgDocument) { this.#state = document.clone(); }
  restore(): SvgDocument { return this.#state.clone(); }
}

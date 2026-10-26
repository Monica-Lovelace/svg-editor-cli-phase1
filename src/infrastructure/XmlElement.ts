import { EditorError } from '../domain/EditorError.js';

export type OrderedNode = Record<string, unknown>;

/** Isolates the XML library's preserveOrder representation from the domain. */
export class XmlElement {
  readonly name: string;
  readonly #raw: OrderedNode;
  constructor(raw: OrderedNode) {
    this.#raw = raw;
    this.name = Object.keys(raw).find(key => key !== ':@') ?? '';
  }
  get attributes(): Record<string, string> {
    const raw = this.#raw[':@'];
    if (raw === undefined) return {};
    if (typeof raw !== 'object' || raw === null) throw new EditorError('invalid XML attributes');
    return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, String(value)]));
  }
  get nodes(): readonly XmlElement[] {
    const nodes = this.#raw[this.name];
    return Array.isArray(nodes) ? nodes.map(node => new XmlElement(node as OrderedNode)) : [];
  }
  get text(): string { return this.name === '#text' ? String(this.#raw['#text'] ?? '') : ''; }
  get elements(): readonly XmlElement[] { return this.nodes.filter(node => !node.name.startsWith('#') && !node.name.startsWith('?')); }
  get content(): string { return this.nodes.map(node => node.text).join(''); }
}

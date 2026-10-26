import { GeometryShape } from './GeometryShape.js';

export class Text extends GeometryShape {
  #text: string;
  constructor(id: string, x: number, y: number, text: string) { super(id, { x, y }, ['x'], ['y']); this.#text = text; }
  override get type(): string { return 'text'; }
  override get textContent(): string { return this.#text; }
  override get geometrySummary(): string { return `(${this.number('x')},${this.number('y')}) ${JSON.stringify(this.#text)}`; }
  override setAttribute(name: string, value: string): void {
    if (name === 'text') this.#text = value;
    else super.setAttribute(name, value);
  }
  override clone(): Text {
    const result = new Text(this.id, this.number('x'), this.number('y'), this.#text);
    this.copyPresentationTo(result); return result;
  }
}

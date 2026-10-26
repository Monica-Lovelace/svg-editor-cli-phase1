import type { Group } from './Group.js';
import { EditorError } from '../EditorError.js';
import { Numeric } from '../Numeric.js';

export abstract class Shape {
  readonly #id: string;
  #presentation: Record<string, string> = {};

  protected constructor(id: string) {
    if (!id || /[\s\u0000-\u001f]/u.test(id)) throw new EditorError(`invalid id: ${id}`);
    this.#id = id;
  }

  get id(): string { return this.#id; }
  abstract get type(): string;
  get label(): string { return `${this.type}#${this.id}`; }
  get children(): readonly Shape[] { return []; }
  get container(): Group | undefined { return undefined; }
  get textContent(): string | undefined { return undefined; }
  get attributes(): Readonly<Record<string, string>> {
    return Object.freeze({ id: this.id, ...this.#presentation });
  }

  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract clone(): Shape;
  abstract get geometrySummary(): string;

  contains(other: Shape): boolean {
    return this === other || this.children.some(child => child.contains(other));
  }

  get summary(): string {
    const style = Object.entries(this.#presentation).map(([key, value]) => `${key}=${value}`).join(' ');
    return [this.label, this.geometrySummary, style].filter(Boolean).join('  ');
  }

  setAttribute(name: string, value: string): void {
    if (!['fill', 'stroke', 'stroke-width'].includes(name)) {
      throw new EditorError(`unknown attribute: ${name}`);
    }
    if (name === 'stroke-width') value = String(Numeric.nonnegative(Numeric.parse(value, name), name));
    this.#presentation[name] = value;
  }

  /** Import-only presentation properties: CLI set remains strictly whitelisted. */
  importPresentation(attributes: Readonly<Record<string, string>>): void {
    for (const [name, value] of Object.entries(attributes)) {
      if (['fill', 'stroke', 'stroke-width'].includes(name)) this.setAttribute(name, value);
      else this.#presentation[name] = value;
    }
  }

  protected copyPresentationTo(target: Shape): void {
    target.#presentation = { ...this.#presentation };
  }
}

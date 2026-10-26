import { Shape } from './Shape.js';
import { Numeric } from '../Numeric.js';

/** Encapsulates numeric invariants; subclasses define coordinates and polymorphic display. */
export abstract class GeometryShape extends Shape {
  #geometry: Record<string, number>;
  readonly #xNames: readonly string[];
  readonly #yNames: readonly string[];
  readonly #sizes: readonly string[];

  protected constructor(id: string, geometry: Record<string, number>, xNames: readonly string[], yNames: readonly string[], sizes: readonly string[] = []) {
    super(id);
    this.#geometry = { ...geometry };
    this.#xNames = xNames;
    this.#yNames = yNames;
    this.#sizes = sizes;
    this.validate(this.#geometry);
  }

  protected number(name: string): number { return this.#geometry[name]!; }

  override get attributes(): Readonly<Record<string, string>> {
    return Object.freeze({ ...super.attributes, ...Object.fromEntries(Object.entries(this.#geometry).map(([key, value]) => [key, String(value)])) });
  }

  override move(dx: number, dy: number): void {
    Numeric.finite(dx, 'dx'); Numeric.finite(dy, 'dy');
    const next = { ...this.#geometry };
    for (const key of this.#xNames) next[key] = this.number(key) + dx;
    for (const key of this.#yNames) next[key] = this.number(key) + dy;
    this.validate(next);
    this.#geometry = next;
  }

  override scale(factor: number): void {
    Numeric.positive(factor, 'scale factor');
    const next = Object.fromEntries(Object.entries(this.#geometry).map(([key, value]) => [key, value * factor]));
    this.validate(next);
    this.#geometry = next;
  }

  override setAttribute(name: string, value: string): void {
    if (!Object.hasOwn(this.#geometry, name)) { super.setAttribute(name, value); return; }
    const next = { ...this.#geometry, [name]: Numeric.parse(value, name) };
    this.validate(next);
    this.#geometry = next;
  }

  private validate(geometry: Record<string, number>): void {
    for (const [key, value] of Object.entries(geometry)) Numeric.finite(value, key);
    for (const key of this.#sizes) Numeric.nonnegative(geometry[key]!, key);
  }
}

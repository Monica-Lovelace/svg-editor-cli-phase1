import { Shape } from './Shape.js';
import { Numeric } from '../Numeric.js';
import { EditorError } from '../EditorError.js';

export class Group extends Shape {
  #children: Shape[] = [];
  constructor(id: string) { super(id); }
  override get type(): string { return 'g'; }
  override get container(): Group { return this; }
  override get children(): readonly Shape[] { return Object.freeze([...this.#children]); }
  override get geometrySummary(): string { return ''; }

  insert(shape: Shape, index = this.#children.length): void {
    if (shape === this || shape.contains(this)) throw new EditorError(`cannot add a container into its own descendant: ${shape.id}`);
    if (this.#children.includes(shape)) throw new EditorError(`shape already in container: ${shape.id}`);
    this.#children.splice(index, 0, shape);
  }

  remove(shape: Shape): number {
    const index = this.#children.indexOf(shape);
    if (index < 0) throw new EditorError(`shape is not in container: ${shape.id}`);
    this.#children.splice(index, 1); return index;
  }

  override move(dx: number, dy: number): void {
    Numeric.finite(dx, 'dx'); Numeric.finite(dy, 'dy');
    for (const shape of this.#children) shape.move(dx, dy);
  }

  override scale(factor: number): void {
    Numeric.positive(factor, 'scale factor');
    for (const shape of this.#children) shape.scale(factor);
  }

  override clone(): Group {
    const result = new Group(this.id);
    this.copyPresentationTo(result);
    for (const shape of this.#children) result.insert(shape.clone());
    return result;
  }
}

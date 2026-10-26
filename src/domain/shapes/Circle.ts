import { GeometryShape } from './GeometryShape.js';

export class Circle extends GeometryShape {
  constructor(id: string, cx: number, cy: number, r: number) { super(id, { cx, cy, r }, ['cx'], ['cy'], ['r']); }
  override get type(): string { return 'circle'; }
  override get geometrySummary(): string { return `cx=${this.number('cx')} cy=${this.number('cy')} r=${this.number('r')}`; }
  override clone(): Circle {
    const result = new Circle(this.id, this.number('cx'), this.number('cy'), this.number('r'));
    this.copyPresentationTo(result); return result;
  }
}

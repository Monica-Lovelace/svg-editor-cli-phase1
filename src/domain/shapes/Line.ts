import { GeometryShape } from './GeometryShape.js';

export class Line extends GeometryShape {
  constructor(id: string, x1: number, y1: number, x2: number, y2: number) { super(id, { x1, y1, x2, y2 }, ['x1', 'x2'], ['y1', 'y2']); }
  override get type(): string { return 'line'; }
  override get geometrySummary(): string { return `(${this.number('x1')},${this.number('y1')}) -> (${this.number('x2')},${this.number('y2')})`; }
  override clone(): Line {
    const result = new Line(this.id, this.number('x1'), this.number('y1'), this.number('x2'), this.number('y2'));
    this.copyPresentationTo(result); return result;
  }
}

import { GeometryShape } from './GeometryShape.js';

export class Ellipse extends GeometryShape {
  constructor(id: string, cx: number, cy: number, rx: number, ry: number) { super(id, { cx, cy, rx, ry }, ['cx'], ['cy'], ['rx', 'ry']); }
  override get type(): string { return 'ellipse'; }
  override get geometrySummary(): string { return `cx=${this.number('cx')} cy=${this.number('cy')} rx=${this.number('rx')} ry=${this.number('ry')}`; }
  override clone(): Ellipse {
    const result = new Ellipse(this.id, this.number('cx'), this.number('cy'), this.number('rx'), this.number('ry'));
    this.copyPresentationTo(result); return result;
  }
}

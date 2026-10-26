import { GeometryShape } from './GeometryShape.js';

export class Rect extends GeometryShape {
  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id, { x, y, width, height }, ['x'], ['y'], ['width', 'height']);
  }
  override get type(): string { return 'rect'; }
  override get geometrySummary(): string { return `x=${this.number('x')} y=${this.number('y')} w=${this.number('width')} h=${this.number('height')}`; }
  override clone(): Rect {
    const result = new Rect(this.id, this.number('x'), this.number('y'), this.number('width'), this.number('height'));
    this.copyPresentationTo(result); return result;
  }
}

import type { SvgDocument } from '../domain/SvgDocument.js';
import type { Shape } from '../domain/shapes/Shape.js';

export class TreeRenderer {
  render(document: SvgDocument, id?: string): string {
    if (id !== undefined) {
      const shape = document.find(id);
      return [shape.summary, ...this.children(shape.children, '')].join('\n');
    }
    return [`svg (${document.width}x${document.height})`, ...this.children(document.children, '')].join('\n');
  }

  private children(shapes: readonly Shape[], prefix: string): string[] {
    return shapes.flatMap((shape, index) => {
      const last = index === shapes.length - 1;
      return [`${prefix}${last ? '└── ' : '├── '}${shape.summary}`, ...this.children(shape.children, prefix + (last ? '    ' : '│   '))];
    });
  }
}

import type { SvgDocument } from '../domain/SvgDocument.js';

export class ShapeInspector {
  render(document: SvgDocument, id: string): string {
    const shape = document.find(id);
    const lines = [`${shape.label}  parent=${document.parentOf(id)?.label ?? 'svg'}`];
    for (const [name, value] of Object.entries(shape.attributes)) if (name !== 'id') lines.push(`  ${name}=${value}`);
    if (shape.textContent !== undefined) lines.push(`  text=${JSON.stringify(shape.textContent)}`);
    return lines.join('\n');
  }
}

import type { SvgDocument } from '../domain/SvgDocument.js';
import type { Shape } from '../domain/shapes/Shape.js';
import { EditorError } from '../domain/EditorError.js';

/** All shape-specific information arrives through polymorphic read-only projections. */
export class SvgWriter {
  serialize(document: SvgDocument): string {
    document.assertValid();
    const root = { xmlns: 'http://www.w3.org/2000/svg', width: String(document.width), height: String(document.height), viewBox: `0 0 ${document.width} ${document.height}`, ...document.presentation };
    return ['<?xml version="1.0" encoding="UTF-8"?>', `<svg${this.attributes(root)}>`, ...document.children.map(shape => this.shape(shape, 1)), '</svg>', ''].join('\n');
  }

  private shape(shape: Shape, depth: number): string {
    const indent = '  '.repeat(depth);
    const start = `${indent}<${shape.type}${this.attributes(shape.attributes)}`;
    if (shape.textContent !== undefined) return `${start}>${this.escape(shape.textContent)}</${shape.type}>`;
    if (!shape.children.length) return `${start}/>`;
    return [start + '>', ...shape.children.map(child => this.shape(child, depth + 1)), `${indent}</${shape.type}>`].join('\n');
  }

  private attributes(attributes: Readonly<Record<string, string>>): string {
    return Object.entries(attributes).map(([key, value]) => ` ${key}="${this.escape(value).replace(/"/g, '&quot;').replace(/\t/g, '&#9;').replace(/\n/g, '&#10;').replace(/\r/g, '&#13;')}"`).join('');
  }

  private escape(value: string): string {
    if (/[^\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]/u.test(value)) throw new EditorError('invalid XML character');
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

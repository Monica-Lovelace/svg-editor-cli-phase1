import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { EditorError } from '../domain/EditorError.js';
import { Numeric } from '../domain/Numeric.js';
import type { Shape } from '../domain/shapes/Shape.js';
import { XmlElement, type OrderedNode } from './XmlElement.js';
import { SvgTransform } from './SvgTransform.js';

export class SvgReader {
  constructor(private readonly factory = new ShapeFactory()) {}

  parse(source: string): { document: SvgDocument; warnings: readonly string[] } {
    if (/<!DOCTYPE/i.test(source)) throw new EditorError('unsupported SVG DOCTYPE');
    const validation = XMLValidator.validate(source);
    if (validation !== true) throw new EditorError(`invalid SVG XML: ${validation.err.msg}`);
    const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: '', parseTagValue: false, parseAttributeValue: false, trimValues: false, ignoreDeclaration: true, commentPropName: '#comment' });
    const roots = (parser.parse(source) as OrderedNode[]).map(raw => new XmlElement(raw)).filter(element => !element.name.startsWith('#') && !element.name.startsWith('?'));
    if (roots.length !== 1 || roots[0]!.name !== 'svg') throw new EditorError('expected one <svg> root');
    const root = roots[0]!;
    const attributes = root.attributes;
    if (attributes.xmlns !== undefined && attributes.xmlns !== 'http://www.w3.org/2000/svg') throw new EditorError('unsupported SVG namespace');
    const width = Numeric.positive(Numeric.parse((attributes.width ?? '800').replace(/px$/, ''), 'canvas width'), 'canvas width');
    const height = Numeric.positive(Numeric.parse((attributes.height ?? '600').replace(/px$/, ''), 'canvas height'), 'canvas height');
    if (attributes.viewBox !== undefined) {
      const box = attributes.viewBox.trim().split(/[\s,]+/).map(value => Numeric.parse(value, 'viewBox'));
      if (box.length !== 4 || box[0] !== 0 || box[1] !== 0 || box[2] !== width || box[3] !== height) throw new EditorError('unsupported viewBox; expected 0 0 width height');
    }
    const presentation: Record<string, string> = {};
    const rootPresentation = ['fill','stroke','stroke-width','font-size','font-family','font-weight','font-style','text-anchor','xml:space'];
    for (const [key, value] of Object.entries(attributes)) {
      if (['xmlns','width','height','viewBox','version','transform'].includes(key)) continue;
      if (!rootPresentation.includes(key)) throw new EditorError(`unsupported SVG root attribute: ${key}`);
      presentation[key] = value;
    }
    const document = new SvgDocument(width, height, presentation);
    const used = new Set<string>();
    const collect = (element: XmlElement): void => {
      const id = element.attributes.id;
      if (id) {
        if (used.has(id)) throw new EditorError(`id already exists: ${id}`);
        used.add(id);
      }
      element.elements.forEach(collect);
    };
    root.elements.forEach(collect);
    const warnings: string[] = [];
    const counters = new Map<string, number>();
    const transform = SvgTransform.parse(attributes.transform);
    for (const element of root.elements) {
      document.add(this.readElement(element, transform, presentation, used, counters, warnings));
    }
    document.assertValid();
    return { document, warnings };
  }

  private readElement(element: XmlElement, parentTransform: SvgTransform, inherited: Readonly<Record<string, string>>, used: Set<string>, counters: Map<string, number>, warnings: string[]): Shape {
    const attributes = element.attributes;
    if (!attributes.id) {
      let next = counters.get(element.name) ?? 1;
      while (used.has(`${element.name}${next}`)) next++;
      attributes.id = `${element.name}${next}`;
      counters.set(element.name, next + 1); used.add(attributes.id);
      warnings.push(`warning: assigned id ${attributes.id} to unnamed <${element.name}>`);
    }
    const transform = parentTransform.combine(SvgTransform.parse(attributes.transform));
    delete attributes.transform;
    const shape = this.factory.fromAttributes(element.name, attributes, element.content);
    const effective = { ...inherited, ...attributes };
    if (shape.container) {
      if (element.content.trim()) throw new EditorError(`unexpected text inside <${element.name}>`);
      for (const child of element.elements) shape.container.insert(this.readElement(child, transform, effective, used, counters, warnings));
    } else {
      if (element.elements.length) throw new EditorError(`unsupported nested content in <${element.name}>`);
      if (shape.textContent === undefined && element.content.trim()) throw new EditorError(`unexpected text inside <${element.name}>`);
      shape.scale(transform.factor); shape.move(transform.dx, transform.dy);
      // Bake inherited scale into the presentation values that SVG transforms scale visually.
      if (transform.factor !== 1) {
        const stroke = Numeric.nonnegative(Numeric.parse((effective['stroke-width'] ?? '1').replace(/px$/, ''), 'stroke-width'), 'stroke-width');
        shape.setAttribute('stroke-width', String(stroke * transform.factor));
        if (shape.textContent !== undefined) {
          const size = Numeric.nonnegative(Numeric.parse((effective['font-size'] ?? '16').replace(/px$/, ''), 'font-size'), 'font-size');
          shape.importPresentation({ 'font-size': String(Numeric.finite(size * transform.factor, 'font-size')) });
        }
      }
    }
    return shape;
  }
}

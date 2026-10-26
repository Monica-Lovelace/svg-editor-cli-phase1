import { EditorError } from './EditorError.js';
import { Numeric } from './Numeric.js';
import { Shape } from './shapes/Shape.js';
import { Rect } from './shapes/Rect.js';
import { Circle } from './shapes/Circle.js';
import { Ellipse } from './shapes/Ellipse.js';
import { Line } from './shapes/Line.js';
import { Text } from './shapes/Text.js';
import { Group } from './shapes/Group.js';

interface ShapeSpec {
  readonly geometry: readonly string[];
  readonly text?: boolean;
  readonly paint?: string;
  readonly construct: (id: string, values: Record<string, number>, text: string) => Shape;
}

/** Name dispatch point 2. TODO: replace the built-in catalog with provider registration. */
export class ShapeFactory {
  readonly #specs = new Map<string, ShapeSpec>([
    ['rect', { geometry: ['x', 'y', 'width', 'height'], paint: 'fill', construct: (id, v) => new Rect(id, v.x!, v.y!, v.width!, v.height!) }],
    ['circle', { geometry: ['cx', 'cy', 'r'], paint: 'fill', construct: (id, v) => new Circle(id, v.cx!, v.cy!, v.r!) }],
    ['ellipse', { geometry: ['cx', 'cy', 'rx', 'ry'], paint: 'fill', construct: (id, v) => new Ellipse(id, v.cx!, v.cy!, v.rx!, v.ry!) }],
    ['line', { geometry: ['x1', 'y1', 'x2', 'y2'], paint: 'stroke', construct: (id, v) => new Line(id, v.x1!, v.y1!, v.x2!, v.y2!) }],
    ['text', { geometry: ['x', 'y'], text: true, construct: (id, v, text) => new Text(id, v.x!, v.y!, text) }],
    ['g', { geometry: [], construct: id => new Group(id) }],
  ]);

  create(type: string, id: string, args: readonly string[]): Shape {
    const spec = this.spec(type);
    const required = spec.geometry.length + (spec.text ? 1 : 0);
    if (args.length < required || args.length > required + (spec.paint ? 1 : 0)) {
      throw new EditorError(`invalid parameters for ${type}; use 'help' for syntax`);
    }
    const numbers = Object.fromEntries(spec.geometry.map((name, index) => [name, Numeric.parse(args[index]!, name)]));
    const shape = spec.construct(id, numbers, spec.text ? args[spec.geometry.length]! : '');
    if (spec.paint && args[required] !== undefined) shape.setAttribute(spec.paint, args[required]!);
    return shape;
  }

  fromAttributes(type: string, attributes: Readonly<Record<string, string>>, text = ''): Shape {
    const spec = this.spec(type);
    const numbers = Object.fromEntries(spec.geometry.map(name => [name, Numeric.parse((attributes[name] ?? '0').replace(/px$/, ''), name)]));
    const shape = spec.construct(attributes.id!, numbers, text);
    const presentation: Record<string, string> = {};
    const allowed = ['fill', 'stroke', 'stroke-width', 'font-size', 'font-family', 'font-weight', 'font-style', 'text-anchor', 'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'xml:space'];
    for (const [name, value] of Object.entries(attributes)) {
      if (name === 'id' || spec.geometry.includes(name)) continue;
      if (!allowed.includes(name) && !name.startsWith('data-')) throw new EditorError(`unsupported SVG attribute: ${name}`);
      presentation[name] = name === 'stroke-width' ? value.replace(/px$/, '') : value;
    }
    shape.importPresentation(presentation);
    return shape;
  }

  private spec(type: string): ShapeSpec {
    const spec = this.#specs.get(type);
    if (!spec) throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    return spec;
  }
}

import { Numeric } from '../domain/Numeric.js';
import { EditorError } from '../domain/EditorError.js';

/** Restricted SVG affine transform: positive uniform scale plus translation. */
export class SvgTransform {
  constructor(readonly factor = 1, readonly dx = 0, readonly dy = 0) {}

  combine(local: SvgTransform): SvgTransform {
    return new SvgTransform(
      Numeric.positive(this.factor * local.factor, 'transform scale'),
      Numeric.finite(this.dx + this.factor * local.dx, 'transform x'),
      Numeric.finite(this.dy + this.factor * local.dy, 'transform y'),
    );
  }

  static parse(source = ''): SvgTransform {
    let result = new SvgTransform();
    let cursor = 0;
    const pattern = /\s*(translate|scale)\s*\(([^)]*)\)\s*,?\s*/gy;
    while (cursor < source.length) {
      if (!source.slice(cursor).trim()) break;
      pattern.lastIndex = cursor;
      const match = pattern.exec(source);
      if (!match) throw new EditorError('unsupported SVG transform; only translate and positive uniform scale are supported');
      const values = match[2]!.trim().split(/[\s,]+/).map(value => Numeric.parse(value, 'transform'));
      if (values.length < 1 || values.length > 2) throw new EditorError('invalid SVG transform parameters');
      // Parsing transform syntax is distinct from dispatching shape/command names.
      const translation = match[1] === 'translate';
      if (!translation && values.length === 2 && values[0] !== values[1]) throw new EditorError('unsupported non-uniform SVG scale');
      const local = translation
        ? new SvgTransform(1, values[0]!, values[1] ?? 0)
        : new SvgTransform(Numeric.positive(values[0]!, 'transform scale'));
      result = result.combine(local); cursor = pattern.lastIndex;
    }
    return result;
  }
}

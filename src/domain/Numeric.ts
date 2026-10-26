import { EditorError } from './EditorError.js';

export class Numeric {
  static parse(value: string, label: string): number {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
      throw new EditorError(`invalid number for ${label}: ${value}`);
    }
    return this.finite(Number(value), label);
  }

  static finite(value: number, label: string): number {
    if (!Number.isFinite(value)) throw new EditorError(`invalid number for ${label}`);
    return Object.is(value, -0) ? 0 : value;
  }

  static nonnegative(value: number, label: string): number {
    this.finite(value, label);
    if (value < 0) throw new EditorError(`${label} must be non-negative`);
    return value;
  }

  static positive(value: number, label: string): number {
    this.finite(value, label);
    if (value <= 0) throw new EditorError(`${label} must be positive`);
    return value;
  }

  static format(value: number): string {
    return String(Object.is(value, -0) ? 0 : value);
  }
}

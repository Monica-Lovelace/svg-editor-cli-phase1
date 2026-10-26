/** A user-facing, single-line domain/application failure. */
export class EditorError extends Error {
  override readonly name = 'EditorError';
}

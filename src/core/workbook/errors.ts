/**
 * Parsing error types, kept in a dependency-free module so the UI can import
 * `WorkbookParseError` (for `instanceof` checks) without pulling the heavy XLSX
 * parser into the initial bundle. The parser itself is code-split and loaded on
 * demand.
 */
export type ParseErrorCode =
  | 'empty-file'
  | 'too-large'
  | 'unsupported-type'
  | 'format-mismatch'
  | 'corrupt'
  | 'encoding'
  | 'no-data';

/** A user-facing parsing error. `message` is safe to display (no raw data). */
export class WorkbookParseError extends Error {
  readonly code: ParseErrorCode;
  constructor(code: ParseErrorCode, message: string) {
    super(message);
    this.name = 'WorkbookParseError';
    this.code = code;
  }
}

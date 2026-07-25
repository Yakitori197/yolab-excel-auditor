/**
 * Shared, pure helpers for the rule engine: cell classification, type
 * inference, date-format signatures and small sampling utilities.
 *
 * Everything here is deterministic and side-effect free so rules stay testable.
 */
import type { InferredType, SheetModel, WorkbookCell } from '../types';

/** Max number of example locations we keep per finding (privacy + brevity). */
export const MAX_LOCATION_SAMPLES = 20;

/** A cell counts as "blank" when it carries no data (and is not a formula/error). */
export function isBlankCell(cell: WorkbookCell): boolean {
  if (cell.formula || cell.error) return false;
  if (cell.value === null) return true;
  return typeof cell.value === 'string' && cell.value.trim() === '';
}

/**
 * Named date-format signatures. Compact all-digit strings are intentionally
 * excluded so numeric IDs are never mistaken for dates.
 */
const DATE_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'iso-dash', re: /^\d{4}-\d{1,2}-\d{1,2}$/ },
  { name: 'iso-slash', re: /^\d{4}\/\d{1,2}\/\d{1,2}$/ },
  { name: 'iso-dot', re: /^\d{4}\.\d{1,2}\.\d{1,2}$/ },
  { name: 'dmy-slash', re: /^\d{1,2}\/\d{1,2}\/\d{4}$/ },
  { name: 'dmy-dash', re: /^\d{1,2}-\d{1,2}-\d{4}$/ },
  { name: 'dmy-dot', re: /^\d{1,2}\.\d{1,2}\.\d{4}$/ },
  { name: 'cjk', re: /^\d{4}年\d{1,2}月\d{1,2}日$/ },
];

/** Return a date-format signature name, or null when the text is not date-like. */
export function dateSignature(text: string): string | null {
  const trimmed = text.trim();
  for (const { name, re } of DATE_PATTERNS) {
    if (re.test(trimmed)) return name;
  }
  return null;
}

/** True when the trimmed text is a plain number (optionally with thousands separators). */
export function isNumericText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === '') return false;
  return /^[-+]?(\d{1,3}(,\d{3})+|\d+)(\.\d+)?$/.test(trimmed);
}

/**
 * A value that is genuinely a number accidentally stored as text.
 * Leading-zero codes ("007") and very long digit runs (IDs) are excluded to
 * avoid flagging legitimate text codes.
 */
export function isNumberStoredAsText(cell: WorkbookCell): boolean {
  if (cell.sourceType !== 'string') return false;
  const trimmed = cell.text.trim();
  if (!isNumericText(trimmed)) return false;
  const digitsOnly = trimmed.replace(/[^\d]/g, '');
  if (digitsOnly.length > 15) return false; // huge -> likely an identifier
  if (/^0\d/.test(trimmed)) return false; // leading zero -> likely a code
  return true;
}

/** Infer what a cell's content represents, independent of how it was stored. */
export function inferredType(cell: WorkbookCell): InferredType {
  if (cell.error) return 'error';
  switch (cell.sourceType) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'date';
    case 'empty':
      return 'empty';
    case 'error':
      return 'error';
    case 'string':
    default: {
      const trimmed = cell.text.trim();
      if (trimmed === '') return 'empty';
      if (isNumericText(trimmed)) return 'number';
      if (dateSignature(trimmed) !== null) return 'date';
      return 'string';
    }
  }
}

/** All rows except the assumed header row (row index 0). */
export function dataRows(sheet: SheetModel): WorkbookCell[][] {
  return sheet.rows.slice(1);
}

/** Get the cell at a column for a given data-row array (guards ragged rows). */
export function cellAt(row: WorkbookCell[], colIndex: number): WorkbookCell | undefined {
  return row[colIndex];
}

/** Cap an array to a sample size to keep findings compact and privacy-safe. */
export function capSample<T>(items: T[], max: number = MAX_LOCATION_SAMPLES): T[] {
  return items.length <= max ? items : items.slice(0, max);
}

/** Display label for a column: its header name, or the column letter fallback. */
export function columnLabel(sheet: SheetModel, colIndex: number, letter: string): string {
  const header = sheet.headers[colIndex];
  const trimmed = (header ?? '').trim();
  return trimmed !== '' ? trimmed : letter;
}

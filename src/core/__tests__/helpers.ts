/**
 * Small builders for constructing workbook models in tests without any file I/O.
 */
import type {
  SheetModel,
  WorkbookCell,
  WorkbookFileType,
  WorkbookModel,
} from '../types';

export function sText(text: string): WorkbookCell {
  return { value: text, sourceType: 'string', text };
}

export function sNum(n: number): WorkbookCell {
  return { value: n, sourceType: 'number', text: String(n) };
}

export function sBool(b: boolean): WorkbookCell {
  return { value: b, sourceType: 'boolean', text: b ? 'TRUE' : 'FALSE' };
}

export function sDate(iso: string): WorkbookCell {
  return { value: iso, sourceType: 'date', text: iso };
}

export function sBlank(): WorkbookCell {
  return { value: null, sourceType: 'empty', text: '' };
}

export function sError(token: string): WorkbookCell {
  return { value: null, sourceType: 'error', text: token, error: token };
}

export function sFormula(formula: string, result: WorkbookCell): WorkbookCell {
  return { ...result, formula };
}

export interface MakeSheetOptions {
  hidden?: boolean;
  merges?: string[];
  /** Override the computed row count (used to simulate very large sheets cheaply). */
  rowCount?: number;
  /** Override the computed column count. */
  columnCount?: number;
}

export function makeSheet(
  name: string,
  rows: WorkbookCell[][],
  opts: MakeSheetOptions = {},
): SheetModel {
  const columnCount = opts.columnCount ?? rows.reduce((max, row) => Math.max(max, row.length), 0);
  const headers = rows.length > 0 ? rows[0].map((cell) => cell.text) : [];
  return {
    name,
    hidden: opts.hidden ?? false,
    rows,
    headers,
    rowCount: opts.rowCount ?? rows.length,
    columnCount,
    merges: opts.merges ?? [],
  };
}

export interface MakeWorkbookOptions {
  fileType?: WorkbookFileType;
  fileName?: string;
  fileSizeBytes?: number;
}

export function makeWorkbook(sheets: SheetModel[], opts: MakeWorkbookOptions = {}): WorkbookModel {
  return {
    fileName: opts.fileName ?? 'test.xlsx',
    fileSizeBytes: opts.fileSizeBytes ?? 2048,
    fileType: opts.fileType ?? 'xlsx',
    sheets,
  };
}

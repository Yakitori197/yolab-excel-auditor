/**
 * Browser-side workbook parsing.
 *
 * XLSX is parsed with SheetJS Community Edition and CSV with PapaParse (MIT).
 * Both run entirely in the user's browser — nothing is uploaded anywhere.
 *
 * The parser produces the framework-free `WorkbookModel` consumed by the rule
 * engine. It never logs cell values and it defends against oversized, empty,
 * corrupt, mis-named and mis-typed files with friendly, non-crashing errors.
 *
 * Resource safety: before allocating any dense grid it enforces a strict cell
 * budget (per sheet AND per workbook) plus a sheet-count limit, using the
 * DECLARED range (`!ref`) — so a tiny file that declares a huge range is
 * rejected up front rather than silently truncated or driven into OOM.
 */
import * as XLSX from 'xlsx';
import type { CellObject, Range, WorkBook } from 'xlsx';
import Papa from 'papaparse';

import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../../appInfo';
import type { SheetModel, WorkbookCell, WorkbookModel } from '../types';
import { WorkbookParseError } from './errors';

export type { ParseErrorCode } from './errors';
export { WorkbookParseError } from './errors';

/** Resource limits. The cell budgets bound how large a dense grid we allocate. */
export const MAX_SHEETS = 64;
export const MAX_ROWS_PER_SHEET = 1_048_576; // XLSX hard row limit
export const MAX_COLS_PER_SHEET = 16_384; // XLSX hard column limit
export const MAX_CELLS_PER_SHEET = 1_500_000;
export const MAX_CELLS_PER_WORKBOOK = 3_000_000;

/** SheetJS numeric error codes -> Excel error text (fallback when `w` is absent). */
const ERROR_CODE_TEXT: Record<number, string> = {
  0x00: '#NULL!',
  0x07: '#DIV/0!',
  0x0f: '#VALUE!',
  0x17: '#REF!',
  0x1d: '#NAME?',
  0x24: '#NUM!',
  0x2a: '#N/A',
  0x2b: '#GETTING_DATA',
};

function toIsoDateString(date: Date): string {
  const time = date.getTime();
  if (Number.isNaN(time)) return '';
  return date.toISOString();
}

const BLANK_CELL: WorkbookCell = { value: null, sourceType: 'empty', text: '' };

/* --------------------------------------------------------------------------
 * Format sniffing — never trust the extension alone.
 * -------------------------------------------------------------------------- */

/** ZIP local-file header (PK\x03\x04, and the empty/spanned variants). XLSX is a ZIP. */
function looksLikeZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)
  );
}

/** Compound File Binary (legacy .xls / .doc) signature. */
function looksLikeCfb(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  );
}

/** Verify the bytes actually are an XLSX (ZIP) container. Throws otherwise. */
export function assertXlsxSignature(bytes: Uint8Array): void {
  if (looksLikeZip(bytes)) return;
  if (looksLikeCfb(bytes)) {
    throw new WorkbookParseError(
      'unsupported-type',
      '這是舊版 .xls（二進位）格式，本工具不支援。請在 Excel 另存為 .xlsx 後再試。',
    );
  }
  throw new WorkbookParseError(
    'format-mismatch',
    '這個檔案的內容不是有效的 .xlsx（可能是改了副檔名的 CSV 或文字檔）。請提供真正的 .xlsx 檔案。',
  );
}

/** Verify the bytes are not actually a binary spreadsheet mislabelled as CSV. */
export function assertCsvNotBinary(bytes: Uint8Array): void {
  if (looksLikeZip(bytes)) {
    throw new WorkbookParseError(
      'format-mismatch',
      '這看起來是 Excel（.xlsx）或壓縮檔，而不是 CSV。請改用 .xlsx，或將資料另存為純文字 CSV。',
    );
  }
  if (looksLikeCfb(bytes)) {
    throw new WorkbookParseError(
      'format-mismatch',
      '這看起來是舊版 Excel（.xls）二進位檔，而不是 CSV。請另存為 CSV 或 .xlsx。',
    );
  }
}

/* --------------------------------------------------------------------------
 * Cell normalization.
 * -------------------------------------------------------------------------- */

function errorText(cell: CellObject): string {
  if (typeof cell.w === 'string' && cell.w !== '') return cell.w;
  if (typeof cell.v === 'number' && cell.v in ERROR_CODE_TEXT) return ERROR_CODE_TEXT[cell.v];
  return '#ERROR!';
}

/** Convert a SheetJS cell object into our normalized model cell. */
function normalizeSheetCell(cell: CellObject | undefined): WorkbookCell {
  if (!cell || cell.t === 'z') return BLANK_CELL;
  const formula = typeof cell.f === 'string' && cell.f !== '' ? cell.f : undefined;
  const withFormula = (base: WorkbookCell): WorkbookCell => (formula ? { ...base, formula } : base);

  switch (cell.t) {
    case 'e': {
      const err = errorText(cell);
      return { value: null, sourceType: 'error', text: err, error: err, ...(formula ? { formula } : {}) };
    }
    case 'n': {
      const value = typeof cell.v === 'number' ? cell.v : Number(cell.v);
      const text = typeof cell.w === 'string' ? cell.w : String(value);
      return withFormula({ value, sourceType: 'number', text });
    }
    case 'b':
      return withFormula({ value: Boolean(cell.v), sourceType: 'boolean', text: cell.v ? 'TRUE' : 'FALSE' });
    case 'd': {
      const date = cell.v instanceof Date ? cell.v : new Date(String(cell.v));
      const iso = toIsoDateString(date);
      return withFormula({ value: iso, sourceType: 'date', text: iso });
    }
    case 's':
    default: {
      const text = typeof cell.v === 'string' ? cell.v : String(cell.v ?? cell.w ?? '');
      if (text === '') return formula ? withFormula({ value: null, sourceType: 'string', text: '' }) : BLANK_CELL;
      return withFormula({ value: text, sourceType: 'string', text });
    }
  }
}

function cellIsBlank(cell: WorkbookCell): boolean {
  if (cell.formula || cell.error) return false;
  return cell.value === null || (typeof cell.value === 'string' && cell.value.trim() === '');
}

/** Trim trailing all-blank rows and columns so the used range reflects real data. */
function trimGrid(grid: WorkbookCell[][]): { rows: WorkbookCell[][]; columnCount: number } {
  let lastRow = -1;
  let lastCol = -1;
  for (let r = 0; r < grid.length; r += 1) {
    const row = grid[r];
    for (let c = 0; c < row.length; c += 1) {
      if (!cellIsBlank(row[c])) {
        if (r > lastRow) lastRow = r;
        if (c > lastCol) lastCol = c;
      }
    }
  }
  if (lastRow === -1 || lastCol === -1) return { rows: [], columnCount: 0 };

  const columnCount = lastCol + 1;
  const rows: WorkbookCell[][] = [];
  for (let r = 0; r <= lastRow; r += 1) {
    const source = grid[r] ?? [];
    const row: WorkbookCell[] = new Array(columnCount);
    for (let c = 0; c < columnCount; c += 1) row[c] = source[c] ?? BLANK_CELL;
    rows.push(row);
  }
  return { rows, columnCount };
}

/* --------------------------------------------------------------------------
 * Budget planning — enforced BEFORE any dense grid is allocated.
 * -------------------------------------------------------------------------- */

function emptySheetModel(name: string, hidden: boolean): SheetModel {
  return { name, hidden, rows: [], headers: [], rowCount: 0, columnCount: 0, merges: [] };
}

function isSheetHidden(workbook: WorkBook, index: number): boolean {
  const meta = workbook.Workbook?.Sheets?.[index];
  return meta?.Hidden === 1 || meta?.Hidden === 2;
}

/**
 * Validate every sheet's declared range against the per-sheet, per-workbook and
 * sheet-count limits. Returns the decoded range per sheet (null when empty) so
 * the build pass can reuse it. Throws a friendly error the moment a limit is
 * exceeded — never truncates silently.
 */
export function planSheetBudgets(workbook: WorkBook): Array<Range | null> {
  const names = workbook.SheetNames;
  if (names.length > MAX_SHEETS) {
    throw new WorkbookParseError(
      'too-large',
      `工作表數量過多（${names.length} 張，超過 ${MAX_SHEETS} 張的上限）。請拆分檔案後再試。`,
    );
  }

  let totalCells = 0;
  return names.map((name) => {
    const worksheet = workbook.Sheets[name];
    const ref = worksheet?.['!ref'];
    if (!worksheet || !ref) return null;

    const range = XLSX.utils.decode_range(ref);
    if (
      !Number.isFinite(range.e.r) ||
      !Number.isFinite(range.e.c) ||
      range.e.r < range.s.r ||
      range.e.c < range.s.c
    ) {
      return null;
    }

    const rows = range.e.r + 1;
    const cols = range.e.c + 1;
    if (rows > MAX_ROWS_PER_SHEET || cols > MAX_COLS_PER_SHEET || rows * cols > MAX_CELLS_PER_SHEET) {
      throw new WorkbookParseError(
        'too-large',
        `工作表「${name}」宣告的資料範圍過大（約 ${rows} 列 × ${cols} 欄），` +
          `超過單張工作表 ${MAX_CELLS_PER_SHEET} 格的上限。請縮小資料範圍或拆分後再試。`,
      );
    }

    totalCells += rows * cols;
    if (totalCells > MAX_CELLS_PER_WORKBOOK) {
      throw new WorkbookParseError(
        'too-large',
        `整份工作簿的資料量過大（超過 ${MAX_CELLS_PER_WORKBOOK} 格的上限）。請縮小或拆分檔案後再試。`,
      );
    }
    return range;
  });
}

function buildSheetModel(
  workbook: WorkBook,
  name: string,
  index: number,
  range: Range | null,
): SheetModel {
  const hidden = isSheetHidden(workbook, index);
  const worksheet = workbook.Sheets[name];
  if (!worksheet || !range) return emptySheetModel(name, hidden);

  const endRow = range.e.r;
  const endCol = range.e.c;

  const grid: WorkbookCell[][] = [];
  for (let r = 0; r <= endRow; r += 1) {
    const row: WorkbookCell[] = new Array(endCol + 1);
    for (let c = 0; c <= endCol; c += 1) {
      const address = XLSX.utils.encode_cell({ r, c });
      row[c] = normalizeSheetCell(worksheet[address] as CellObject | undefined);
    }
    grid.push(row);
  }

  const { rows, columnCount } = trimGrid(grid);
  const headers = rows.length > 0 ? rows[0].map((cell) => cell.text) : [];
  const merges = (worksheet['!merges'] ?? []).map((m) => XLSX.utils.encode_range(m));

  return { name, hidden, rows, headers, rowCount: rows.length, columnCount, merges };
}

/** Parse an XLSX workbook from raw bytes. */
export function parseXlsx(
  data: ArrayBuffer | Uint8Array,
  fileName: string,
  fileSizeBytes: number,
): WorkbookModel {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  assertXlsxSignature(bytes);

  let workbook: WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: 'array',
      cellFormula: true,
      cellDates: true,
      cellText: true,
      sheetStubs: true,
      dense: false,
    });
  } catch (err) {
    if (err instanceof WorkbookParseError) throw err;
    throw new WorkbookParseError(
      'corrupt',
      '無法讀取這個 Excel 檔案，可能已損毀、被密碼保護，或不是有效的 .xlsx 格式。',
    );
  }

  const ranges = planSheetBudgets(workbook);
  const sheets = workbook.SheetNames.map((name, index) =>
    buildSheetModel(workbook, name, index, ranges[index]),
  );
  return { fileName, fileSizeBytes, fileType: 'xlsx', sheets };
}

/** Decode CSV bytes into text, honoring common BOMs and warning on likely non-UTF-8. */
export function decodeCsvBuffer(buffer: ArrayBuffer): { text: string; warning?: string } {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: new TextDecoder('utf-16le').decode(buffer) };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: new TextDecoder('utf-16be').decode(buffer) };
  }
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  // U+FFFD replacement characters strongly suggest a non-UTF-8 encoding (e.g. Big5).
  const replacements = (text.match(/�/g) ?? []).length;
  if (replacements > 0) {
    return {
      text,
      warning:
        '偵測到可能非 UTF-8 的編碼（例如 Big5）。部分文字可能顯示為亂碼；建議另存為 UTF-8 後再試。',
    };
  }
  return { text };
}

export interface CsvParseResult {
  workbook: WorkbookModel;
  warning?: string;
}

/** Summarize PapaParse errors and field-count inconsistencies (never silent). */
function csvWarning(errors: Papa.ParseError[], rows: string[][]): string | undefined {
  const parts: string[] = [];
  if (errors.length > 0) {
    const kinds = [...new Set(errors.map((e) => e.code || e.type || 'Error'))];
    parts.push(`CSV 解析回報 ${errors.length} 處異常（${kinds.join('、')}）`);
  }
  const fieldCounts = new Set(
    rows.filter((row) => row.some((cell) => (cell ?? '').trim() !== '')).map((row) => row.length),
  );
  if (fieldCounts.size > 1) parts.push('部分列的欄位數不一致');
  if (parts.length === 0) return undefined;
  return `${parts.join('；')}。分析結果可能不完整，建議檢查原始檔（本工具不會修改您的檔案）。`;
}

export interface CsvLimits {
  maxRows: number;
  maxCols: number;
  maxCells: number;
}

export const DEFAULT_CSV_LIMITS: CsvLimits = {
  maxRows: MAX_ROWS_PER_SHEET,
  maxCols: MAX_COLS_PER_SHEET,
  maxCells: MAX_CELLS_PER_SHEET,
};

/**
 * Parse CSV text into a single-sheet workbook, surfacing parse anomalies.
 *
 * Rows are consumed incrementally through PapaParse's `step` callback while the
 * row / column / cell counts are accumulated. The moment any limit is crossed
 * the parser is aborted and a friendly error is thrown — we never buffer the
 * whole (potentially huge) result set before checking, so a stream of many
 * tiny rows is stopped early instead of being fully materialized first.
 */
export function parseCsvText(
  text: string,
  fileName: string,
  fileSizeBytes: number,
  limits: CsvLimits = DEFAULT_CSV_LIMITS,
): CsvParseResult {
  const rawRows: string[][] = [];
  const errors: Papa.ParseError[] = [];
  let maxCols = 0;
  let cellCount = 0;
  let budgetError: WorkbookParseError | null = null;

  Papa.parse<string[]>(text, {
    skipEmptyLines: 'greedy',
    header: false,
    step: (result, parser) => {
      const row = Array.isArray(result.data) ? (result.data as string[]) : [];
      if (result.errors.length > 0) errors.push(...result.errors);

      rawRows.push(row);
      if (row.length > maxCols) maxCols = row.length;
      cellCount += row.length;

      // Accumulated rows / columns / cells; abort the instant a limit is passed
      // (rawRows.length × maxCols also guards the dense grid we will allocate).
      if (
        rawRows.length > limits.maxRows ||
        maxCols > limits.maxCols ||
        cellCount > limits.maxCells ||
        rawRows.length * maxCols > limits.maxCells
      ) {
        budgetError = new WorkbookParseError(
          'too-large',
          `CSV 資料量過大（已超過單張工作表上限：${limits.maxRows} 列 / ${limits.maxCols} 欄 / ${limits.maxCells} 格）。請縮小或拆分檔案後再試。`,
        );
        parser.abort();
      }
    },
  });

  if (budgetError) throw budgetError;

  const grid: WorkbookCell[][] = rawRows.map((row) =>
    row.map((value): WorkbookCell => {
      const cellText = value ?? '';
      if (cellText.trim() === '') return { value: null, sourceType: 'empty', text: cellText };
      return { value: cellText, sourceType: 'string', text: cellText };
    }),
  );

  const { rows, columnCount } = trimGrid(grid);
  const headers = rows.length > 0 ? rows[0].map((cell) => cell.text) : [];
  const sheetName = fileName.replace(/\.[^.]+$/, '') || 'CSV';

  const sheet: SheetModel = {
    name: sheetName,
    hidden: false,
    rows,
    headers,
    rowCount: rows.length,
    columnCount,
    merges: [],
  };

  const workbook: WorkbookModel = { fileName, fileSizeBytes, fileType: 'csv', sheets: [sheet] };
  const warning = csvWarning(errors, rawRows);
  return warning ? { workbook, warning } : { workbook };
}

function mergeWarnings(...warnings: Array<string | undefined>): string | undefined {
  const parts = warnings.filter((w): w is string => Boolean(w));
  return parts.length > 0 ? parts.join(' ') : undefined;
}

/** Parse CSV from raw bytes: reject mislabelled binaries, decode, then parse. */
export function parseCsv(
  buffer: ArrayBuffer,
  fileName: string,
  fileSizeBytes: number,
): CsvParseResult {
  assertCsvNotBinary(new Uint8Array(buffer));
  const { text, warning: encodingWarning } = decodeCsvBuffer(buffer);
  const { workbook, warning: parseWarn } = parseCsvText(text, fileName, fileSizeBytes);
  const warning = mergeWarnings(encodingWarning, parseWarn);
  return warning ? { workbook, warning } : { workbook };
}

function extensionOf(name: string): string {
  const match = /\.[^.]+$/.exec(name.toLowerCase());
  return match ? match[0] : '';
}

/** Validate file metadata before reading its contents. Throws on failure. */
export function validateFileMeta(name: string, sizeBytes: number): '.xlsx' | '.csv' {
  if (sizeBytes === 0) {
    throw new WorkbookParseError('empty-file', '這個檔案是空的，沒有可分析的內容。');
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new WorkbookParseError(
      'too-large',
      `檔案大小超過 ${MAX_FILE_SIZE_MB} MB 的上限。請縮小檔案或拆分後再試。`,
    );
  }
  const ext = extensionOf(name);
  if (ext === '.xlsx') return '.xlsx';
  if (ext === '.csv') return '.csv';
  throw new WorkbookParseError(
    'unsupported-type',
    '目前只支援 .xlsx 與 .csv 檔案。（不支援有密碼保護的 Excel。）',
  );
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () =>
      reject(new WorkbookParseError('corrupt', '讀取檔案時發生錯誤，請再試一次。'));
    reader.readAsArrayBuffer(file);
  });
}

export interface ParseFileResult {
  workbook: WorkbookModel;
  warning?: string;
}

/** Full browser entry point: validate, read and parse a user-selected file. */
export async function parseFile(file: File): Promise<ParseFileResult> {
  const ext = validateFileMeta(file.name, file.size);
  const buffer = await readFileAsArrayBuffer(file);

  if (ext === '.xlsx') {
    return { workbook: parseXlsx(buffer, file.name, file.size) };
  }
  return parseCsv(buffer, file.name, file.size);
}

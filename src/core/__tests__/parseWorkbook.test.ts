import * as XLSX from 'xlsx';
import type { WorkBook } from 'xlsx';
import { describe, expect, it } from 'vitest';
import { MAX_FILE_SIZE_BYTES } from '../../appInfo';
import {
  decodeCsvBuffer,
  MAX_CELLS_PER_SHEET,
  MAX_SHEETS,
  parseCsv,
  parseCsvText,
  parseXlsx,
  planSheetBudgets,
  validateFileMeta,
  WorkbookParseError,
} from '../workbook/parseWorkbook';

function toArrayBuffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

function textBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function toFreshArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function buildXlsxBuffer(): Uint8Array {
  const wb = XLSX.utils.book_new();

  const data = XLSX.utils.aoa_to_sheet([['SKU', 'Qty'], ['A1', 10], ['A2', 20], [], ['note']]);
  data['!merges'] = [XLSX.utils.decode_range('A5:B5')];
  XLSX.utils.book_append_sheet(wb, data, 'Data');

  const calc = XLSX.utils.aoa_to_sheet([['result']]);
  calc['A2'] = { t: 'e', f: 'A1/0', w: '#DIV/0!', v: 0x07 };
  calc['!ref'] = 'A1:A2';
  XLSX.utils.book_append_sheet(wb, calc, 'Calc');

  const hidden = XLSX.utils.aoa_to_sheet([['secret']]);
  XLSX.utils.book_append_sheet(wb, hidden, 'HiddenSheet');

  wb.Workbook = { Sheets: wb.SheetNames.map((name) => ({ name, Hidden: name === 'HiddenSheet' ? 1 : 0 })) };

  // Wrap so the result is always a real Uint8Array with byteOffset 0.
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array);
}

/** Minimal fake SheetJS workbook carrying only declared ranges, for budget tests. */
function fakeWorkbook(refs: Array<string | null>): WorkBook {
  const SheetNames = refs.map((_, i) => `S${i}`);
  const Sheets: Record<string, unknown> = {};
  refs.forEach((ref, i) => {
    Sheets[`S${i}`] = ref ? { '!ref': ref } : {};
  });
  return { SheetNames, Sheets } as unknown as WorkBook;
}

describe('validateFileMeta', () => {
  it('accepts supported extensions', () => {
    expect(validateFileMeta('report.xlsx', 100)).toBe('.xlsx');
    expect(validateFileMeta('data.csv', 100)).toBe('.csv');
  });

  it('rejects empty files', () => {
    expect(() => validateFileMeta('report.xlsx', 0)).toThrow(WorkbookParseError);
  });

  it('rejects oversized files', () => {
    expect(() => validateFileMeta('report.xlsx', MAX_FILE_SIZE_BYTES + 1)).toThrow(/上限/);
  });

  it('rejects unsupported extensions', () => {
    expect(() => validateFileMeta('notes.txt', 100)).toThrow(WorkbookParseError);
  });
});

describe('format detection (does not trust the extension)', () => {
  it('rejects a CSV that was renamed to .xlsx', () => {
    expect(() => parseXlsx(textBytes('SKU,Qty\nA1,10\n'), 'fake.xlsx', 15)).toThrow(/有效的 \.xlsx/);
  });

  it('rejects legacy .xls (CFB) content', () => {
    const cfb = toArrayBuffer([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]);
    expect(() => parseXlsx(cfb, 'old.xlsx', 9)).toThrow(WorkbookParseError);
  });

  it('rejects an XLSX that was renamed to .csv', () => {
    const buffer = toFreshArrayBuffer(buildXlsxBuffer());
    expect(() => parseCsv(buffer, 'fake.csv', buffer.byteLength)).toThrow(WorkbookParseError);
  });
});

describe('parseCsvText', () => {
  it('parses a simple CSV into a single sheet', () => {
    const csv = 'SKU,Qty\nA1,10\nA2,20\n';
    const { workbook, warning } = parseCsvText(csv, 'data.csv', csv.length);
    expect(warning).toBeUndefined();
    expect(workbook.fileType).toBe('csv');
    expect(workbook.sheets).toHaveLength(1);
    expect(workbook.sheets[0].rowCount).toBe(3);
    expect(workbook.sheets[0].columnCount).toBe(2);
    expect(workbook.sheets[0].headers).toEqual(['SKU', 'Qty']);
  });

  it('handles an empty CSV without throwing', () => {
    const { workbook } = parseCsvText('', 'empty.csv', 0);
    expect(workbook.sheets[0].rowCount).toBe(0);
  });

  it('warns on malformed CSV (unterminated quote)', () => {
    const { warning } = parseCsvText('a,b\n"x,y\n1,2', 'bad.csv', 12);
    expect(warning).toBeTruthy();
  });

  it('warns on inconsistent field counts (ragged rows)', () => {
    const { warning } = parseCsvText('a,b,c\n1,2\n3,4,5,6', 'ragged.csv', 17);
    expect(warning).toBeTruthy();
  });
});

describe('decodeCsvBuffer', () => {
  it('decodes UTF-8 (stripping a BOM) without a warning', () => {
    const result = decodeCsvBuffer(toArrayBuffer([0xef, 0xbb, 0xbf, 0x61, 0x2c, 0x62]));
    expect(result.text).toBe('a,b');
    expect(result.warning).toBeUndefined();
  });

  it('warns when the bytes are not valid UTF-8', () => {
    const result = decodeCsvBuffer(toArrayBuffer([0xff, 0x41]));
    expect(result.warning).toBeTruthy();
  });
});

describe('resource budgets (reject, never silently truncate)', () => {
  it('accepts a small workbook and returns decoded ranges', () => {
    const ranges = planSheetBudgets(fakeWorkbook(['A1:C10', null]));
    expect(ranges).toHaveLength(2);
    expect(ranges[0]).not.toBeNull();
    expect(ranges[1]).toBeNull();
  });

  it('rejects a tiny sheet that declares an enormous range', () => {
    expect(() => planSheetBudgets(fakeWorkbook(['A1:ZZ100000']))).toThrow(/範圍過大|上限/);
  });

  it('rejects a workbook with too many sheets', () => {
    const many = Array.from({ length: MAX_SHEETS + 1 }, () => 'A1:A1');
    expect(() => planSheetBudgets(fakeWorkbook(many))).toThrow(/工作表數量過多/);
  });

  it('rejects when the combined cell budget is exceeded', () => {
    // Each sheet is under the per-sheet limit, but together they exceed the workbook budget.
    const corner = XLSX.utils.encode_cell({ r: 1099, c: 999 }); // ~1.1M cells each
    const ref = `A1:${corner}`;
    expect(() => planSheetBudgets(fakeWorkbook([ref, ref, ref]))).toThrow(/工作簿的資料量過大/);
  });

  it('rejects a CSV that exceeds the per-sheet cell budget', () => {
    const cols = 1000;
    const rows = Math.ceil(MAX_CELLS_PER_SHEET / cols) + 10;
    const header = Array.from({ length: cols }, (_, i) => `c${i}`).join(',');
    const line = Array.from({ length: cols }, () => '1').join(',');
    const csv = [header, ...Array.from({ length: rows }, () => line)].join('\n');
    expect(() => parseCsvText(csv, 'huge.csv', csv.length)).toThrow(/上限/);
  });

  it('aborts a stream of many very short rows once the row limit is passed', () => {
    // 20k one-column rows with a small injected row limit: the streaming parser
    // must abort mid-stream instead of buffering every row before checking.
    const csv = Array.from({ length: 20_000 }, () => '1').join('\n');
    expect(() =>
      parseCsvText(csv, 'many.csv', csv.length, { maxRows: 100, maxCols: 8, maxCells: 500 }),
    ).toThrow(/上限/);
  });

  it('parses normally when the data stays within injected limits', () => {
    const csv = 'a,b\n1,2\n3,4';
    const { workbook } = parseCsvText(csv, 'ok.csv', csv.length, {
      maxRows: 100,
      maxCols: 8,
      maxCells: 500,
    });
    expect(workbook.sheets[0].rowCount).toBe(3);
  });
});

describe('parseXlsx round-trip', () => {
  it('reads sheets, values, merges, hidden state and formula errors', () => {
    const buffer = buildXlsxBuffer();
    const workbook = parseXlsx(buffer, 'book.xlsx', buffer.byteLength);

    expect(workbook.fileType).toBe('xlsx');
    expect(workbook.sheets.map((s) => s.name)).toEqual(['Data', 'Calc', 'HiddenSheet']);

    const data = workbook.sheets[0];
    expect(data.headers).toEqual(['SKU', 'Qty']);
    expect(data.rows[1][1]).toMatchObject({ value: 10, sourceType: 'number' });
    expect(data.merges).toContain('A5:B5');

    const calc = workbook.sheets[1];
    const errorCells = calc.rows.flat().filter((cell) => cell.error);
    expect(errorCells.some((cell) => cell.error === '#DIV/0!')).toBe(true);

    const hidden = workbook.sheets[2];
    expect(hidden.hidden).toBe(true);
  });

  it('reports a friendly error for corrupt XLSX bytes', () => {
    // Valid ZIP magic header followed by garbage -> SheetJS fails to unzip.
    const corrupt = toArrayBuffer([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x01, 0x02, 0x03]);
    expect(() => parseXlsx(corrupt, 'bad.xlsx', 9)).toThrow(WorkbookParseError);
  });
});

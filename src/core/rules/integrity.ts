/**
 * Data-integrity rules.
 * R014 疑似唯一識別欄位出現重複 — duplicate values in a likely unique-key column.
 */
import type { Finding, RuleDefinition, SheetModel, WorkbookCell } from '../types';
import { columnLetter } from '../workbook/address';
import { capSample, columnLabel, isBlankCell } from './shared';

const ID_WORDS = new Set([
  'id',
  'ids',
  'no',
  'nos',
  'num',
  'number',
  'key',
  'code',
  'sku',
  'uuid',
  'guid',
  'ref',
]);
const ID_HEADER_CJK = /編號|代碼|代號|序號|編碼|識別|流水號|單號|會員號|帳號/;

const MIN_ROWS_FOR_ID_CHECK = 5;
const NEAR_UNIQUE_RATIO = 0.9;
const MOSTLY_UNIQUE_RATIO = 0.7;

/**
 * Heuristic: does a header look like a unique-key column? Handles camelCase
 * ("OrderID"), separators ("order_id", "order id") and common CJK ID terms.
 */
function looksLikeIdHeader(header: string): boolean {
  if (ID_HEADER_CJK.test(header)) return true;
  const spaced = header.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  const tokens = spaced.toLowerCase().split(/\s+/).filter(Boolean);
  return tokens.some((token) => ID_WORDS.has(token));
}

function normalizedValue(cell: WorkbookCell): string {
  const raw = cell.value === null ? cell.text : cell.value;
  return String(raw).trim().toLowerCase();
}

export const duplicateIdRule: RuleDefinition = {
  id: 'R014',
  name: '疑似唯一識別欄位出現重複 Duplicate unique identifiers',
  category: 'integrity',
  description:
    '找出看起來是唯一鍵（如編號、代碼）卻出現重複值的欄位。主鍵重複會造成資料關聯與去重錯誤。',
  evaluate(sheet: SheetModel): Finding[] {
    const affectedColumns: string[] = [];
    let totalDuplicateValues = 0;
    const sampleRows: number[] = [];

    for (let c = 0; c < sheet.columnCount; c += 1) {
      const occurrences = new Map<string, number[]>();
      let nonEmpty = 0;
      for (let r = 1; r < sheet.rowCount; r += 1) {
        const cell = sheet.rows[r]?.[c];
        if (!cell || isBlankCell(cell)) continue;
        nonEmpty += 1;
        const key = normalizedValue(cell);
        const list = occurrences.get(key);
        if (list) list.push(r + 1);
        else occurrences.set(key, [r + 1]);
      }

      if (nonEmpty < MIN_ROWS_FOR_ID_CHECK) continue;

      const uniqueCount = occurrences.size;
      const ratio = uniqueCount / nonEmpty;
      const header = (sheet.headers[c] ?? '').trim();
      const looksLikeId = looksLikeIdHeader(header) || ratio >= NEAR_UNIQUE_RATIO;

      // Only flag columns that are *mostly* unique — a few duplicates in an
      // otherwise-unique column is the signature of an accidental key clash.
      if (!looksLikeId || ratio >= 1 || ratio < MOSTLY_UNIQUE_RATIO) continue;

      let columnDuplicateValues = 0;
      for (const rowNumbers of occurrences.values()) {
        if (rowNumbers.length < 2) continue;
        columnDuplicateValues += 1;
        for (const n of rowNumbers) if (sampleRows.length < 20) sampleRows.push(n);
      }
      if (columnDuplicateValues === 0) continue;

      totalDuplicateValues += columnDuplicateValues;
      affectedColumns.push(columnLabel(sheet, c, columnLetter(c)));
    }

    if (affectedColumns.length === 0) return [];

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: 'high',
        message: `工作表「${sheet.name}」有 ${affectedColumns.length} 個疑似唯一識別欄位出現重複值（共 ${totalDuplicateValues} 個重複鍵）。`,
        impact: '主鍵或識別碼重複，會導致資料表關聯錯誤、去重失敗，以及後續系統匯入時鍵值衝突。',
        recommendation: '確認這些欄位是否應為唯一。若是，找出並修正重複鍵；必要時重新產生流水號。',
        location: { sheet: sheet.name, columns: capSample(affectedColumns), rows: capSample(sampleRows) },
        metrics: { columns: affectedColumns.length, duplicateKeys: totalDuplicateValues },
      },
    ];
  },
};

/**
 * Structure rules.
 * R003 重複資料列 — duplicate data rows.
 * R004 重複或空白欄名 — duplicate / blank column headers.
 * R011 合併儲存格 — merged cells.
 */
import type { Finding, RuleDefinition, SheetModel, WorkbookCell } from '../types';
import { columnLetter } from '../workbook/address';
import { capSample, isBlankCell } from './shared';

const DUPLICATE_ROW_HIGH_RATIO = 0.1;

/** Build a stable, case-insensitive signature for one data row. */
function rowSignature(row: WorkbookCell[] | undefined, columnCount: number): string | null {
  if (!row) return null;
  const parts: string[] = [];
  let hasContent = false;
  for (let c = 0; c < columnCount; c += 1) {
    const cell = row[c];
    if (!cell || isBlankCell(cell)) {
      parts.push('');
      continue;
    }
    hasContent = true;
    const raw = cell.value === null ? cell.text : cell.value;
    parts.push(String(raw).trim().toLowerCase());
  }
  return hasContent ? parts.join('') : null;
}

export const duplicateRowsRule: RuleDefinition = {
  id: 'R003',
  name: '重複資料列 Duplicate rows',
  category: 'structure',
  description: '偵測內容完全相同的資料列（忽略大小寫與前後空白）。重複列常代表重工或資料匯入錯誤。',
  evaluate(sheet: SheetModel): Finding[] {
    const groups = new Map<string, number[]>();
    for (let r = 1; r < sheet.rowCount; r += 1) {
      const sig = rowSignature(sheet.rows[r], sheet.columnCount);
      if (sig === null) continue;
      const list = groups.get(sig);
      if (list) list.push(r + 1);
      else groups.set(sig, [r + 1]);
    }

    let duplicateRows = 0;
    let duplicateGroups = 0;
    const sampleRows: number[] = [];
    for (const rowNumbers of groups.values()) {
      if (rowNumbers.length < 2) continue;
      duplicateGroups += 1;
      duplicateRows += rowNumbers.length - 1;
      for (const n of rowNumbers) if (sampleRows.length < 20) sampleRows.push(n);
    }

    if (duplicateGroups === 0) return [];

    const dataRowCount = Math.max(1, sheet.rowCount - 1);
    const ratio = duplicateRows / dataRowCount;
    const severity = ratio >= DUPLICATE_ROW_HIGH_RATIO ? 'high' : 'medium';

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity,
        message: `工作表「${sheet.name}」發現 ${duplicateGroups} 組重複資料，共 ${duplicateRows} 列多餘。`,
        impact: '重複資料會造成數量、金額或統計重複計算，並使唯一性判斷失準。',
        recommendation: '確認重複列是否為重工。若是，保留一筆並移除其餘；若為刻意保留，建議加上明確區分欄位。',
        location: { sheet: sheet.name, rows: capSample(sampleRows) },
        metrics: { duplicateGroups, duplicateRows },
      },
    ];
  },
};

export const headerQualityRule: RuleDefinition = {
  id: 'R004',
  name: '重複或空白欄名 Duplicate / blank headers',
  category: 'structure',
  description: '檢查標題列（第一列）是否有空白欄名或重複欄名，這會讓程式與公式難以正確參照欄位。',
  evaluate(sheet: SheetModel): Finding[] {
    if (sheet.columnCount === 0) return [];

    const blankColumns: string[] = [];
    const seen = new Map<string, number>();
    const duplicateNames = new Set<string>();

    for (let c = 0; c < sheet.columnCount; c += 1) {
      const header = (sheet.headers[c] ?? '').trim();
      if (header === '') {
        blankColumns.push(columnLetter(c));
        continue;
      }
      const key = header.toLowerCase();
      const count = (seen.get(key) ?? 0) + 1;
      seen.set(key, count);
      if (count >= 2) duplicateNames.add(header);
    }

    if (blankColumns.length === 0 && duplicateNames.size === 0) return [];

    const severity = duplicateNames.size > 0 ? 'high' : 'medium';
    const parts: string[] = [];
    if (duplicateNames.size > 0) parts.push(`${duplicateNames.size} 個重複欄名`);
    if (blankColumns.length > 0) parts.push(`${blankColumns.length} 個空白欄名`);

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity,
        message: `工作表「${sheet.name}」的標題列有 ${parts.join('、')}。`,
        impact: '空白或重複的欄名會讓公式、樞紐分析與程式無法穩定對應欄位，容易取到錯誤資料。',
        recommendation: '為每一欄設定唯一且具意義的名稱，避免空白與重名。',
        location: {
          sheet: sheet.name,
          columns: capSample([...duplicateNames, ...blankColumns]),
        },
        metrics: { duplicateHeaders: duplicateNames.size, blankHeaders: blankColumns.length },
      },
    ];
  },
};

export const mergedCellsRule: RuleDefinition = {
  id: 'R011',
  name: '合併儲存格 Merged cells',
  category: 'structure',
  description: '偵測合併儲存格。合併會破壞表格的方正結構，使排序、篩選與程式讀取產生非預期結果。',
  evaluate(sheet: SheetModel): Finding[] {
    if (sheet.merges.length === 0) return [];

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: 'medium',
        message: `工作表「${sheet.name}」含有 ${sheet.merges.length} 個合併儲存格範圍。`,
        impact: '合併儲存格只在左上角保留值，排序、篩選、樞紐分析與自動化讀取時常導致資料錯位或遺漏。',
        recommendation: '取消合併，改用「跨欄置中」樣式或重複填入實際值，讓每一格都保有資料。',
        location: { sheet: sheet.name, ranges: capSample(sheet.merges) },
        metrics: { mergedRanges: sheet.merges.length },
      },
    ];
  },
};

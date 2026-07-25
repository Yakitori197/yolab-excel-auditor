/**
 * Completeness rules.
 * R001 空白欄位比例 — blank-cell ratio.
 * R002 完全空白的列或欄 — fully empty rows / columns.
 */
import type { Finding, RuleDefinition, SheetModel } from '../types';
import { cellAddress, columnLetter } from '../workbook/address';
import { capSample, columnLabel, isBlankCell, MAX_LOCATION_SAMPLES } from './shared';

const BLANK_RATIO_LOW = 0.05;
const BLANK_RATIO_MEDIUM = 0.15;
const BLANK_RATIO_HIGH = 0.3;

export const blankCellRatioRule: RuleDefinition = {
  id: 'R001',
  name: '空白欄位比例 Blank cell ratio',
  category: 'completeness',
  description:
    '計算資料區域中的空白儲存格比例。過高的空白比例代表資料缺漏，會影響統計、篩選與匯入。',
  evaluate(sheet: SheetModel): Finding[] {
    const dataRowCount = Math.max(0, sheet.rowCount - 1);
    const total = dataRowCount * sheet.columnCount;
    if (total === 0) return [];

    let blanks = 0;
    const sampleCells: string[] = [];
    for (let r = 1; r < sheet.rowCount; r += 1) {
      const row = sheet.rows[r];
      for (let c = 0; c < sheet.columnCount; c += 1) {
        const cell = row?.[c];
        if (!cell || isBlankCell(cell)) {
          blanks += 1;
          if (sampleCells.length < MAX_LOCATION_SAMPLES) {
            sampleCells.push(cellAddress(r, c));
          }
        }
      }
    }

    const ratio = blanks / total;
    if (ratio < BLANK_RATIO_LOW) return [];

    const severity =
      ratio >= BLANK_RATIO_HIGH ? 'high' : ratio >= BLANK_RATIO_MEDIUM ? 'medium' : 'low';
    const pct = (ratio * 100).toFixed(1);

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity,
        message: `工作表「${sheet.name}」的資料區約有 ${pct}% 儲存格為空白（${blanks} / ${total}）。`,
        impact: '空白值過多會造成統計偏差、篩選遺漏，以及後續系統匯入失敗。',
        recommendation:
          '確認空白是否代表「無資料」或「遺漏」。若為遺漏應補齊；若為結構性空白，建議明確標記（例如填入 N/A）。',
        location: { sheet: sheet.name, cells: sampleCells },
        metrics: { blankCells: blanks, totalCells: total, ratio: Number(ratio.toFixed(4)) },
      },
    ];
  },
};

export const emptyRowsColumnsRule: RuleDefinition = {
  id: 'R002',
  name: '完全空白的列或欄 Empty rows / columns',
  category: 'completeness',
  description: '偵測整列或整欄皆為空白的情況，這類空白會切斷資料範圍並干擾樞紐分析與匯入。',
  evaluate(sheet: SheetModel): Finding[] {
    if (sheet.rowCount === 0 || sheet.columnCount === 0) return [];

    // Fully empty rows (search the whole used range, header included).
    const emptyRowNumbers: number[] = [];
    for (let r = 0; r < sheet.rowCount; r += 1) {
      const row = sheet.rows[r];
      let allBlank = true;
      for (let c = 0; c < sheet.columnCount; c += 1) {
        const cell = row?.[c];
        if (cell && !isBlankCell(cell)) {
          allBlank = false;
          break;
        }
      }
      if (allBlank) emptyRowNumbers.push(r + 1);
    }

    // Fully empty columns.
    const emptyColumns: string[] = [];
    for (let c = 0; c < sheet.columnCount; c += 1) {
      let allBlank = true;
      for (let r = 0; r < sheet.rowCount; r += 1) {
        const cell = sheet.rows[r]?.[c];
        if (cell && !isBlankCell(cell)) {
          allBlank = false;
          break;
        }
      }
      if (allBlank) emptyColumns.push(columnLabel(sheet, c, columnLetter(c)));
    }

    const totalIssues = emptyRowNumbers.length + emptyColumns.length;
    if (totalIssues === 0) return [];

    const severity = totalIssues >= 3 ? 'medium' : 'low';
    const parts: string[] = [];
    if (emptyRowNumbers.length > 0) parts.push(`${emptyRowNumbers.length} 個完全空白列`);
    if (emptyColumns.length > 0) parts.push(`${emptyColumns.length} 個完全空白欄`);

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity,
        message: `工作表「${sheet.name}」含有 ${parts.join('、')}。`,
        impact: '完全空白的列或欄會切斷連續資料範圍，導致排序、樞紐分析與程式匯入只讀到部分資料。',
        recommendation: '刪除多餘的空白列與空白欄，讓資料維持連續、單一區塊。',
        location: {
          sheet: sheet.name,
          rows: capSample(emptyRowNumbers),
          columns: capSample(emptyColumns),
        },
        metrics: { emptyRows: emptyRowNumbers.length, emptyColumns: emptyColumns.length },
      },
    ];
  },
};

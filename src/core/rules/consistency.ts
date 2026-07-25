/**
 * Consistency rules.
 * R005 欄位混合資料型別 — mixed data types within a column.
 * R006 日期格式不一致 — inconsistent date formats within a column.
 * R007 數值儲存為文字 — numbers stored as text (XLSX only).
 * R008 前後多餘空白 — leading / trailing whitespace.
 */
import type { Finding, InferredType, RuleDefinition, SheetModel, WorkbookModel } from '../types';
import { cellAddress, columnLetter } from '../workbook/address';
import {
  capSample,
  columnLabel,
  dateSignature,
  inferredType,
  isNumberStoredAsText,
  MAX_LOCATION_SAMPLES,
} from './shared';

const MIN_CELLS_FOR_TYPE_CHECK = 3;
const NUMBER_AS_TEXT_MIN_COUNT = 3;
const NUMBER_AS_TEXT_MIN_RATIO = 0.5;

export const mixedTypesRule: RuleDefinition = {
  id: 'R005',
  name: '欄位混合資料型別 Mixed column types',
  category: 'consistency',
  description: '檢查同一欄是否混用文字、數值、日期等不同型別，這會讓排序、計算與匯入產生非預期結果。',
  evaluate(sheet: SheetModel): Finding[] {
    const affected: string[] = [];
    for (let c = 0; c < sheet.columnCount; c += 1) {
      const counts: Partial<Record<InferredType, number>> = {};
      let nonEmpty = 0;
      for (let r = 1; r < sheet.rowCount; r += 1) {
        const cell = sheet.rows[r]?.[c];
        if (!cell) continue;
        const t = inferredType(cell);
        if (t === 'empty' || t === 'error') continue;
        counts[t] = (counts[t] ?? 0) + 1;
        nonEmpty += 1;
      }
      if (nonEmpty < MIN_CELLS_FOR_TYPE_CHECK) continue;
      const distinct = Object.keys(counts).length;
      if (distinct >= 2) affected.push(columnLabel(sheet, c, columnLetter(c)));
    }

    if (affected.length === 0) return [];

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: 'medium',
        message: `工作表「${sheet.name}」有 ${affected.length} 個欄位混用了不同資料型別。`,
        impact: '同欄混用文字與數值／日期，會讓排序錯亂、加總失敗，並使程式或樞紐分析誤判型別。',
        recommendation: '統一每一欄的資料型別；若確實需要註記，建議另開欄位存放備註。',
        location: { sheet: sheet.name, columns: capSample(affected) },
        metrics: { mixedColumns: affected.length },
      },
    ];
  },
};

export const dateFormatRule: RuleDefinition = {
  id: 'R006',
  name: '日期格式不一致 Inconsistent date formats',
  category: 'consistency',
  description: '檢查同一欄中的日期是否混用多種格式（例如 2024-01-02 與 01/02/2024），造成排序與解析困難。',
  evaluate(sheet: SheetModel): Finding[] {
    const affected: string[] = [];
    for (let c = 0; c < sheet.columnCount; c += 1) {
      const signatures = new Set<string>();
      let dateLike = 0;
      for (let r = 1; r < sheet.rowCount; r += 1) {
        const cell = sheet.rows[r]?.[c];
        if (!cell) continue;
        if (inferredType(cell) !== 'date') continue;
        dateLike += 1;
        const sig = cell.sourceType === 'date' ? 'excel-native' : dateSignature(cell.text);
        if (sig) signatures.add(sig);
      }
      if (dateLike >= 2 && signatures.size >= 2) {
        affected.push(columnLabel(sheet, c, columnLetter(c)));
      }
    }

    if (affected.length === 0) return [];

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: 'medium',
        message: `工作表「${sheet.name}」有 ${affected.length} 個欄位混用了多種日期格式。`,
        impact: '日期格式不一致會讓排序失序、篩選遺漏，並使系統匯入時解析錯誤或拒收。',
        recommendation: '統一為單一日期格式（建議 ISO 8601：YYYY-MM-DD），並以真正的日期型別而非文字儲存。',
        location: { sheet: sheet.name, columns: capSample(affected) },
        metrics: { inconsistentColumns: affected.length },
      },
    ];
  },
};

export const numbersAsTextRule: RuleDefinition = {
  id: 'R007',
  name: '數值儲存為文字 Numbers stored as text',
  category: 'consistency',
  description:
    '偵測本應為數值卻以文字型別儲存的欄位（僅適用 XLSX）。這類欄位無法直接加總或計算。',
  evaluate(sheet: SheetModel, workbook: WorkbookModel): Finding[] {
    // CSV is inherently untyped text, so this check only applies to XLSX where a
    // string type is a deliberate (and usually accidental) choice.
    if (workbook.fileType !== 'xlsx') return [];

    const affected: string[] = [];
    for (let c = 0; c < sheet.columnCount; c += 1) {
      let numberAsText = 0;
      let nonEmpty = 0;
      for (let r = 1; r < sheet.rowCount; r += 1) {
        const cell = sheet.rows[r]?.[c];
        if (!cell || cell.sourceType === 'empty') continue;
        nonEmpty += 1;
        if (isNumberStoredAsText(cell)) numberAsText += 1;
      }
      if (nonEmpty === 0) continue;
      if (numberAsText >= NUMBER_AS_TEXT_MIN_COUNT || numberAsText / nonEmpty >= NUMBER_AS_TEXT_MIN_RATIO) {
        if (numberAsText > 0) affected.push(columnLabel(sheet, c, columnLetter(c)));
      }
    }

    if (affected.length === 0) return [];

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: 'medium',
        message: `工作表「${sheet.name}」有 ${affected.length} 個欄位疑似把數值儲存為文字。`,
        impact: '以文字儲存的數值無法直接加總或運算，且排序時會依字元而非數值大小，造成分析錯誤。',
        recommendation: '將這些欄位轉為數值型別；匯入前可用「資料剖析」或轉換函式修正。',
        location: { sheet: sheet.name, columns: capSample(affected) },
        metrics: { columns: affected.length },
      },
    ];
  },
};

export const whitespaceRule: RuleDefinition = {
  id: 'R008',
  name: '前後多餘空白 Leading / trailing whitespace',
  category: 'consistency',
  description: '偵測文字前後多餘的空白字元，這類差異會讓比對、去重與查表意外失敗。',
  evaluate(sheet: SheetModel): Finding[] {
    let count = 0;
    const sampleCells: string[] = [];
    for (let r = 0; r < sheet.rowCount; r += 1) {
      const row = sheet.rows[r];
      for (let c = 0; c < sheet.columnCount; c += 1) {
        const cell = row?.[c];
        if (!cell || cell.sourceType !== 'string') continue;
        const trimmed = cell.text.trim();
        if (trimmed !== '' && trimmed !== cell.text) {
          count += 1;
          if (sampleCells.length < MAX_LOCATION_SAMPLES) sampleCells.push(cellAddress(r, c));
        }
      }
    }

    if (count === 0) return [];

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: 'low',
        message: `工作表「${sheet.name}」有 ${count} 個儲存格含有前後多餘空白。`,
        impact: '前後空白會讓「看起來相同」的值在比對、去重與查表（VLOOKUP 等）時被視為不同，造成漏配。',
        recommendation: '使用 TRIM 或整批取代移除多餘空白，統一文字內容。',
        location: { sheet: sheet.name, cells: sampleCells },
        metrics: { cells: count },
      },
    ];
  },
};

/**
 * Formula & maintenance rules.
 * R009 公式錯誤值 — formula error values (#DIV/0!, #N/A, ...).
 * R010 大量公式維護風險 — heavy manual-formula maintenance risk.
 */
import type { Finding, RuleDefinition, SheetModel } from '../types';
import { cellAddress } from '../workbook/address';
import { MAX_LOCATION_SAMPLES } from './shared';

const FORMULA_RISK_MEDIUM = 500;
const FORMULA_RISK_LOW = 100;

export const formulaErrorsRule: RuleDefinition = {
  id: 'R009',
  name: '公式錯誤值 Formula error values',
  category: 'formula',
  description: '偵測儲存格中的錯誤值（如 #DIV/0!、#N/A、#REF!）。錯誤值會沿著公式擴散污染下游結果。',
  evaluate(sheet: SheetModel): Finding[] {
    let count = 0;
    const sampleCells: string[] = [];
    const errorTypes = new Map<string, number>();

    for (let r = 0; r < sheet.rowCount; r += 1) {
      const row = sheet.rows[r];
      for (let c = 0; c < sheet.columnCount; c += 1) {
        const cell = row?.[c];
        if (!cell || !cell.error) continue;
        count += 1;
        errorTypes.set(cell.error, (errorTypes.get(cell.error) ?? 0) + 1);
        if (sampleCells.length < MAX_LOCATION_SAMPLES) sampleCells.push(cellAddress(r, c));
      }
    }

    if (count === 0) return [];

    const typeSummary = [...errorTypes.entries()].map(([type, n]) => `${type}×${n}`).join('、');

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: 'high',
        message: `工作表「${sheet.name}」有 ${count} 個公式錯誤值（${typeSummary}）。`,
        impact: '錯誤值會被其他公式引用而持續擴散，導致報表金額、統計與判斷全面失真。',
        recommendation: '逐一修正錯誤來源（例如除以零、參照遺失、查無資料），或以 IFERROR 提供合理預設。',
        location: { sheet: sheet.name, cells: sampleCells },
        metrics: { errorCells: count, errorTypes: errorTypes.size },
      },
    ];
  },
};

export const formulaMaintenanceRule: RuleDefinition = {
  id: 'R010',
  name: '大量公式維護風險 Formula maintenance risk',
  category: 'formula',
  description:
    '統計工作表中的公式數量。大量以人工複製維護的公式，容易在新增或搬移資料時漏改而產生錯誤。',
  evaluate(sheet: SheetModel): Finding[] {
    let formulaCount = 0;
    for (let r = 0; r < sheet.rowCount; r += 1) {
      const row = sheet.rows[r];
      for (let c = 0; c < sheet.columnCount; c += 1) {
        if (row?.[c]?.formula) formulaCount += 1;
      }
    }

    if (formulaCount < FORMULA_RISK_LOW) return [];

    const severity = formulaCount >= FORMULA_RISK_MEDIUM ? 'medium' : 'low';

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity,
        message: `工作表「${sheet.name}」含有 ${formulaCount} 個公式，維護量偏高。`,
        impact: '大量人工維護的公式在新增列、搬移欄或複製貼上時容易漏改，是常見的隱性錯誤來源。',
        recommendation: '評估以表格化結構、樞紐分析或自動化工具取代重複公式，降低人工維護風險。',
        location: { sheet: sheet.name },
        metrics: { formulaCells: formulaCount },
      },
    ];
  },
};

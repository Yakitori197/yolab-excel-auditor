/**
 * Metadata rules.
 * R012 隱藏工作表 — hidden worksheets.
 * R013 資料量異常大的工作表 — abnormally large worksheet.
 */
import type { Finding, RuleDefinition, SheetModel } from '../types';

const LARGE_ROWS = 50_000;
const VERY_LARGE_ROWS = 200_000;
const LARGE_CELLS = 1_000_000;
const VERY_LARGE_CELLS = 5_000_000;

export const hiddenSheetRule: RuleDefinition = {
  id: 'R012',
  name: '隱藏工作表 Hidden worksheet',
  category: 'metadata',
  description: '偵測被隱藏的工作表。隱藏工作表可能藏有被遺忘的資料、暫存計算或不應外流的內容。',
  evaluate(sheet: SheetModel): Finding[] {
    if (!sheet.hidden) return [];

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: 'medium',
        message: `工作表「${sheet.name}」為隱藏狀態。`,
        impact: '隱藏工作表常被忽略，可能保存過期資料、暫存計算，或在分享檔案時意外外流敏感內容。',
        recommendation: '確認隱藏工作表的用途。若已無需要請刪除；若仍需保留，於分享前再次檢查內容。',
        location: { sheet: sheet.name },
        metrics: { hidden: 1 },
      },
    ];
  },
};

export const largeSheetRule: RuleDefinition = {
  id: 'R013',
  name: '資料量異常大的工作表 Oversized worksheet',
  category: 'metadata',
  description: '偵測列數或儲存格數異常龐大的工作表，這類規模已超出試算表的舒適處理範圍。',
  evaluate(sheet: SheetModel): Finding[] {
    const cells = sheet.rowCount * sheet.columnCount;
    const isVeryLarge = sheet.rowCount >= VERY_LARGE_ROWS || cells >= VERY_LARGE_CELLS;
    const isLarge = sheet.rowCount >= LARGE_ROWS || cells >= LARGE_CELLS;
    if (!isLarge) return [];

    return [
      {
        ruleId: this.id,
        ruleName: this.name,
        category: this.category,
        severity: isVeryLarge ? 'high' : 'medium',
        message: `工作表「${sheet.name}」規模龐大（${sheet.rowCount} 列 × ${sheet.columnCount} 欄）。`,
        impact: '過大的試算表開啟緩慢、公式重算耗時，且容易在編輯時當機或遺失資料。',
        recommendation: '評估改用資料庫或分析工具管理此規模的資料；如須留在試算表，建議依時間或分類拆分。',
        location: { sheet: sheet.name },
        metrics: { rows: sheet.rowCount, columns: sheet.columnCount, cells },
      },
    ];
  },
};

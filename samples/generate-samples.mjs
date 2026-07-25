/**
 * Deterministic generator for the demo spreadsheets shipped in this folder.
 *
 * Every value here is fully synthetic — no real company, person, phone, email,
 * address, tax id or product. Run `npm run generate:samples` to (re)create the
 * binary .xlsx files so their provenance is always auditable from source.
 *
 * Uses SheetJS (xlsx) to WRITE the files; the app READS them in-browser.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const OUT_DIR = dirname(fileURLToPath(import.meta.url));

function writeWorkbook(workbook, fileName) {
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  writeFileSync(join(OUT_DIR, fileName), buffer);
  console.log(`  wrote ${fileName}`);
}

function setFormula(sheet, address, formula, cachedValue) {
  sheet[address] = { t: 'n', f: formula, v: cachedValue };
}

/* ------------------------------------------------------------------ */
/* Sample 1 — a clean, healthy inventory sheet (should score ~100).    */
/* ------------------------------------------------------------------ */
function goodInventory() {
  const rows = [
    ['品號 SKU', '品名 Item', '分類 Category', '數量 Qty', '單價 UnitPrice', '更新日期 UpdatedDate'],
    ['SKU-1001', '六角螺絲 M4', '五金 Hardware', 1200, 3.5, new Date(2026, 0, 5)],
    ['SKU-1002', '平墊圈 M4', '五金 Hardware', 860, 1.2, new Date(2026, 0, 5)],
    ['SKU-1003', '彈簧墊圈 M4', '五金 Hardware', 540, 0.8, new Date(2026, 0, 6)],
    ['SKU-1004', '內六角螺栓 M5', '五金 Hardware', 300, 12, new Date(2026, 0, 6)],
    ['SKU-1005', '尼龍華司', '五金 Hardware', 500, 0.5, new Date(2026, 0, 7)],
    ['SKU-1006', '不鏽鋼螺帽 M4', '五金 Hardware', 950, 2.1, new Date(2026, 0, 7)],
    ['SKU-1007', '塑膠束帶 100mm', '耗材 Consumable', 4000, 0.3, new Date(2026, 0, 8)],
    ['SKU-1008', '砂紙 240 目', '耗材 Consumable', 220, 6.5, new Date(2026, 0, 8)],
    ['SKU-1009', '潤滑油 250ml', '耗材 Consumable', 75, 45, new Date(2026, 0, 9)],
    ['SKU-1010', '工具箱 中型', '工具 Tool', 40, 380, new Date(2026, 0, 9)],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, '庫存 Inventory');
  return { workbook, rows };
}

/* ------------------------------------------------------------------ */
/* Sample 2 — the same shape, riddled with quality problems.           */
/* ------------------------------------------------------------------ */
function messyInventory() {
  // Column D is intentionally an interior blank column (blank header + blanks).
  const rows = [
    ['品號 SKU', '品名 Item', '分類 Category', '', '數量 Qty', '單價 UnitPrice', '更新日期 UpdatedDate'],
    ['SKU-1001', '六角螺絲 M4', '五金', '', 1200, '3.5', '2026/01/05'],
    ['SKU-1002', '平墊圈 M4 ', '五金', '', '', 1.2, '05-01-2026'],
    ['SKU-1003', '彈簧墊圈 M4', '五金', '', 'N/A', 0.8, new Date(2026, 0, 7)],
    ['SKU-1001', '六角螺絲 M4', '五金', '', 1200, '3.5', '2026/01/05'],
    ['', '', '', '', '', '', ''],
    ['SKU-1004', '內六角螺栓 M5', '五金', '', 300, '12', '2026-01-08'],
    ['SKU-1005', '尼龍華司', '五金', '', 500, 0.5, '2026/01/09'],
    ['SKU-1006', '不鏽鋼螺帽 M4', '五金', '', 950, '2.1', '2026/1/10'],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows, { cellDates: true });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, '庫存 Inventory');
  return { workbook };
}

/* ------------------------------------------------------------------ */
/* Sample 3 — a multi-sheet production schedule with formulas,          */
/* a merged summary label, a formula error and a hidden Params sheet.   */
/* ------------------------------------------------------------------ */
function productionSchedule() {
  const orders = [
    ['WO-2026-001', '產品 A', 100, 0.5, new Date(2026, 1, 2), '已完成 Done'],
    ['WO-2026-002', '產品 B', 200, 0.25, new Date(2026, 1, 3), '已完成 Done'],
    ['WO-2026-003', '產品 C', 150, 0.4, new Date(2026, 1, 4), '生產中 WIP'],
    ['WO-2026-004', '產品 D', 80, 1.0, new Date(2026, 1, 5), '生產中 WIP'],
    ['WO-2026-005', '產品 E', 300, 0.2, new Date(2026, 1, 6), '待生產 Queued'],
    ['WO-2026-006', '產品 F', 120, 0.75, new Date(2026, 1, 9), '待生產 Queued'],
    ['WO-2026-007', '產品 G', 60, 1.5, new Date(2026, 1, 10), '待生產 Queued'],
    ['WO-2026-008', '產品 H', 220, 0.3, new Date(2026, 1, 11), '待生產 Queued'],
  ];

  const header = ['工單 WorkOrder', '產品 Product', '數量 Qty', '每件工時 HoursPerUnit', '總工時 TotalHours', '開始日 StartDate', '狀態 Status'];
  const totalHours = orders.map((o) => o[2] * o[3]);
  const qtySum = orders.reduce((s, o) => s + o[2], 0);
  const hourSum = totalHours.reduce((s, h) => s + h, 0);

  const aoa = [header];
  orders.forEach((o, i) => {
    aoa.push([o[0], o[1], o[2], o[3], totalHours[i], o[4], o[5]]);
  });
  aoa.push(['小計 Subtotal', '', qtySum, '', hourSum, '', '']);
  aoa.push(['異常示範 Error demo', 0, '', '', '', '', '']);

  const schedule = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });

  // TotalHours column E is a per-row formula (Qty * HoursPerUnit).
  orders.forEach((_, i) => {
    const row = i + 2; // data starts on spreadsheet row 2
    setFormula(schedule, `E${row}`, `C${row}*D${row}`, totalHours[i]);
  });
  // Subtotal row (row 10) uses SUM formulas; label is merged across A:B.
  setFormula(schedule, 'C10', 'SUM(C2:C9)', qtySum);
  setFormula(schedule, 'E10', 'SUM(E2:E9)', hourSum);
  schedule['!merges'] = [XLSX.utils.decode_range('A10:B10')];
  // A deliberate divide-by-zero error to exercise the formula-error rule.
  schedule['B11'] = { t: 'e', f: 'E10/0', w: '#DIV/0!', v: 0x07 };

  const params = XLSX.utils.aoa_to_sheet([
    ['參數 Param', '值 Value'],
    ['標準工時率 StdRate', 1.0],
    ['加班係數 OT factor', 1.5],
    ['稼動率目標 Target', 0.85],
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, schedule, '排程 Schedule');
  XLSX.utils.book_append_sheet(workbook, params, '參數 Params');
  // Mark the Params sheet hidden to exercise the hidden-sheet rule.
  workbook.Workbook = {
    Sheets: workbook.SheetNames.map((name) => ({ name, Hidden: name === '參數 Params' ? 1 : 0 })),
  };
  return { workbook };
}

/* ------------------------------------------------------------------ */
/* CSV variant of the clean inventory (dates as ISO strings).          */
/* ------------------------------------------------------------------ */
function goodInventoryCsv(rows) {
  const toCell = (value) => {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = rows.map((row) => row.map(toCell).join(',')).join('\r\n');
  writeFileSync(join(OUT_DIR, 'good-inventory.csv'), `﻿${csv}`, 'utf8');
  console.log('  wrote good-inventory.csv');
}

function main() {
  console.log('Generating synthetic demo files…');
  const good = goodInventory();
  writeWorkbook(good.workbook, 'good-inventory.xlsx');
  writeWorkbook(messyInventory().workbook, 'messy-inventory.xlsx');
  writeWorkbook(productionSchedule().workbook, 'production-schedule.xlsx');
  goodInventoryCsv(good.rows);
  console.log('Done.');
}

main();

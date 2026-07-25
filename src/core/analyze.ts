/**
 * Analysis orchestrator: runs every registered rule over a parsed workbook and
 * assembles the final, privacy-safe `AnalysisResult` (findings + score).
 *
 * This module is pure: `WorkbookModel` in, `AnalysisResult` out. No I/O, no DOM.
 */
import { ruleRegistry } from './rules/registry';
import { computeScore } from './scoring/score';
import type {
  AnalysisResult,
  Finding,
  Severity,
  SheetModel,
  SheetSummary,
  WorkbookModel,
} from './types';
import { cellAddress } from './workbook/address';

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

function sheetRange(sheet: SheetModel): string {
  if (sheet.rowCount === 0 || sheet.columnCount === 0) return '';
  return `${cellAddress(0, 0)}:${cellAddress(sheet.rowCount - 1, sheet.columnCount - 1)}`;
}

function summarizeSheet(sheet: SheetModel, findings: Finding[]): SheetSummary {
  const findingCounts: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    if (f.location.sheet === sheet.name) findingCounts[f.severity] += 1;
  }
  return {
    name: sheet.name,
    hidden: sheet.hidden,
    rowCount: sheet.rowCount,
    columnCount: sheet.columnCount,
    range: sheetRange(sheet),
    findingCounts,
  };
}

/** Run the full audit pipeline over a parsed workbook. */
export function analyzeWorkbook(workbook: WorkbookModel): AnalysisResult {
  const findings: Finding[] = [];
  for (const sheet of workbook.sheets) {
    for (const rule of ruleRegistry) {
      findings.push(...rule.evaluate(sheet, workbook));
    }
  }

  // Stable ordering: most severe first, then by sheet, then by rule id.
  findings.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      a.location.sheet.localeCompare(b.location.sheet) ||
      a.ruleId.localeCompare(b.ruleId),
  );

  const score = computeScore(findings);
  const sheetSummaries = workbook.sheets.map((sheet) => summarizeSheet(sheet, findings));

  return {
    fileName: workbook.fileName,
    fileSizeBytes: workbook.fileSizeBytes,
    fileType: workbook.fileType,
    sheetCount: workbook.sheets.length,
    sheetSummaries,
    findings,
    score,
  };
}

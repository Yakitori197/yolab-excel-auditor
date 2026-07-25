/**
 * Public surface of the analysis core. The UI imports from here only, keeping
 * the analysis logic cleanly separated from React.
 */
export * from './types';
export { analyzeWorkbook } from './analyze';
export { ruleRegistry, getRuleById } from './rules/registry';
export { computeScore, SEVERITY_POINTS, CATEGORY_CAP, CATEGORY_LABELS } from './scoring/score';
export { estimateRoi, WEEKS_PER_MONTH, ROI_DISCLAIMER } from './roi/roi';
export type { RoiInputs, RoiResult } from './roi/roi';
export { buildReport, toReportJson, sanitizeFileName } from './report/buildReport';
export type { ReportSummary, ReportMeta, ReportFileInfo } from './report/buildReport';
export {
  parseFile,
  parseXlsx,
  parseCsv,
  parseCsvText,
  decodeCsvBuffer,
  validateFileMeta,
} from './workbook/parseWorkbook';
export type { ParseFileResult, CsvParseResult } from './workbook/parseWorkbook';
// Error type lives in a dependency-free module so it can be imported without
// pulling the code-split XLSX parser into the initial bundle.
export { WorkbookParseError } from './workbook/errors';
export type { ParseErrorCode } from './workbook/errors';
export { cellAddress, columnLetter, rangeAddress } from './workbook/address';

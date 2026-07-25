/**
 * Report builder.
 *
 * Assembles a JSON-serializable summary from an `AnalysisResult`. By design the
 * report contains only metadata, findings (locations + counts) and the score —
 * never full rows of the user's raw data.
 *
 * Privacy guarantees enforced here:
 *  - The file name is reduced to its basename (no absolute filesystem paths).
 *  - Findings already carry no raw cell values; the report copies them verbatim.
 */
import { APP_NAME, APP_VERSION } from '../../appInfo';
import type { AnalysisResult, Finding, HealthScore, SheetSummary, WorkbookFileType } from '../types';
import type { RoiResult } from '../roi/roi';

export interface ReportMeta {
  tool: string;
  version: string;
  generatedAt: string;
  privacyNote: string;
}

export interface ReportFileInfo {
  name: string;
  sizeBytes: number;
  type: WorkbookFileType;
  sheetCount: number;
}

export interface ReportSummary {
  meta: ReportMeta;
  file: ReportFileInfo;
  score: HealthScore;
  sheets: SheetSummary[];
  findings: Finding[];
  roi: RoiResult | null;
}

export interface BuildReportOptions {
  roi?: RoiResult | null;
  /** ISO timestamp for the report. Injected so the output stays deterministic in tests. */
  generatedAt?: string;
}

const PRIVACY_NOTE =
  '本報告僅包含工作表、欄位與位置等中繼資訊，不含完整原始資料列，也不含電腦上的絕對路徑。' +
  ' / This report contains metadata and locations only — no full data rows, no absolute file paths.';

/** Reduce any path-like name to its basename, guarding against leaked paths. */
export function sanitizeFileName(name: string): string {
  const parts = name.split(/[\\/]/);
  return parts[parts.length - 1] || name;
}

export function buildReport(result: AnalysisResult, options: BuildReportOptions = {}): ReportSummary {
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  return {
    meta: {
      tool: APP_NAME,
      version: APP_VERSION,
      generatedAt,
      privacyNote: PRIVACY_NOTE,
    },
    file: {
      name: sanitizeFileName(result.fileName),
      sizeBytes: result.fileSizeBytes,
      type: result.fileType,
      sheetCount: result.sheetCount,
    },
    score: result.score,
    sheets: result.sheetSummaries,
    findings: result.findings.map(stripFindingToSafeShape),
    roi: options.roi ?? null,
  };
}

/**
 * Defensive copy that keeps only the known, privacy-safe fields of a finding.
 * Even if a future rule accidentally attaches raw data, it cannot reach export.
 */
function stripFindingToSafeShape(finding: Finding): Finding {
  return {
    ruleId: finding.ruleId,
    ruleName: finding.ruleName,
    category: finding.category,
    severity: finding.severity,
    message: finding.message,
    impact: finding.impact,
    recommendation: finding.recommendation,
    location: {
      sheet: finding.location.sheet,
      cells: finding.location.cells ? [...finding.location.cells] : undefined,
      columns: finding.location.columns ? [...finding.location.columns] : undefined,
      rows: finding.location.rows ? [...finding.location.rows] : undefined,
      ranges: finding.location.ranges ? [...finding.location.ranges] : undefined,
    },
    metrics: finding.metrics ? { ...finding.metrics } : undefined,
  };
}

/** Serialize a report to a downloadable, pretty-printed JSON string. */
export function toReportJson(report: ReportSummary): string {
  return JSON.stringify(report, null, 2);
}

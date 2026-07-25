/**
 * Core domain types for the YoLab Excel Auditor.
 *
 * These types are intentionally framework-free (no React, no DOM) so that the
 * whole analysis pipeline can be unit-tested in isolation and reused anywhere.
 *
 * Privacy note: nothing in these structures is meant to carry full rows of the
 * user's raw data. Findings and reports reference *locations* (sheet / column /
 * cell address) and *counts*, never the underlying cell values.
 */

/** Severity of a finding. 嚴重程度。 */
export type Severity = 'high' | 'medium' | 'low';

/** Rule grouping used for the score breakdown. 規則分類。 */
export type RuleCategory =
  | 'structure' // 結構 Structure
  | 'completeness' // 完整性 Completeness
  | 'consistency' // 一致性 Consistency
  | 'formula' // 公式與維護 Formula & maintenance
  | 'metadata' // 中繼資料與隱藏內容 Metadata & hidden content
  | 'integrity'; // 資料完整性 Data integrity

/** How the source file stored a given cell. */
export type CellType = 'empty' | 'string' | 'number' | 'boolean' | 'date' | 'error';

/** What a cell's content *looks* like after inspection (used by inference). */
export type InferredType = 'empty' | 'number' | 'date' | 'boolean' | 'string' | 'error';

/** A normalized primitive cell value used for analysis. */
export type CellPrimitive = string | number | boolean | null;

/** A single normalized cell. */
export interface WorkbookCell {
  /** Normalized value. Dates are stored as ISO date strings (YYYY-MM-DD...). */
  value: CellPrimitive;
  /** The type as stored in the source file. */
  sourceType: CellType;
  /** Raw textual representation. Preserves leading/trailing whitespace for strings. */
  text: string;
  /** Formula source (without leading `=`) when the cell was a formula. */
  formula?: string;
  /** Error token such as "#DIV/0!" when the cell (or its formula) errored. */
  error?: string;
}

/** One worksheet (or the single sheet synthesized from a CSV file). */
export interface SheetModel {
  name: string;
  /** True when the sheet is hidden or very-hidden in the source workbook. */
  hidden: boolean;
  /** All rows in the used range. Index 0 is the first row (treated as header). */
  rows: WorkbookCell[][];
  /** Text of the first row per column (best-effort header names). */
  headers: string[];
  /** Number of rows in the used range (including the header row). */
  rowCount: number;
  /** Number of columns in the used range. */
  columnCount: number;
  /** Merged-cell ranges in A1 notation, e.g. "A1:B2". */
  merges: string[];
}

export type WorkbookFileType = 'xlsx' | 'csv';

/** The parsed, normalized workbook handed to the rule engine. */
export interface WorkbookModel {
  fileName: string;
  fileSizeBytes: number;
  fileType: WorkbookFileType;
  sheets: SheetModel[];
}

/** Where a finding applies. All fields are capped/sampled to avoid data dumps. */
export interface FindingLocation {
  sheet: string;
  /** Sampled A1 cell addresses. */
  cells?: string[];
  /** Column header names (or letters when a header is blank). */
  columns?: string[];
  /** Sampled 1-based row numbers. */
  rows?: number[];
  /** A1 ranges, e.g. merged-cell ranges. */
  ranges?: string[];
}

/** A single data-quality finding produced by a rule. */
export interface Finding {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  severity: Severity;
  /** Human-readable problem description. Never contains raw cell values. */
  message: string;
  /** 影響範圍 — what this affects / why it matters. */
  impact: string;
  /** 建議處理方式 — recommended remediation. */
  recommendation: string;
  location: FindingLocation;
  /** Structured, numeric-only metrics (counts / ratios). No raw data. */
  metrics?: Record<string, number>;
}

/** A rule implementation. Rules are pure functions over a single sheet. */
export interface RuleDefinition {
  id: string;
  name: string;
  category: RuleCategory;
  /** Short explanation of what the rule checks (used in docs / UI). */
  description: string;
  /**
   * Evaluate one sheet and return zero or more findings.
   * The full workbook is provided for cross-sheet / file-type context.
   */
  evaluate: (sheet: SheetModel, workbook: WorkbookModel) => Finding[];
}

export interface SheetSummary {
  name: string;
  hidden: boolean;
  rowCount: number;
  columnCount: number;
  /** Data range in A1 notation, e.g. "A1:D120" (empty string when no data). */
  range: string;
  findingCounts: Record<Severity, number>;
}

export interface ScoreDeduction {
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  severity: Severity;
  /** Points removed from 100 (positive number). */
  points: number;
  reason: string;
}

export interface CategoryScore {
  category: RuleCategory;
  label: string;
  /** Points deducted within this category (after the per-category cap). */
  deducted: number;
  /** 0–100 sub-score for the category. */
  score: number;
}

export interface HealthScore {
  /** Overall 0–100 score. */
  total: number;
  /** Letter grade A–F. */
  grade: string;
  /** Localized grade label. */
  gradeLabel: string;
  categories: CategoryScore[];
  deductions: ScoreDeduction[];
}

export interface AnalysisResult {
  fileName: string;
  fileSizeBytes: number;
  fileType: WorkbookFileType;
  sheetCount: number;
  sheetSummaries: SheetSummary[];
  findings: Finding[];
  score: HealthScore;
}

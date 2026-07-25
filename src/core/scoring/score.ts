/**
 * Transparent, explainable health scoring.
 *
 * The score starts at 100 and subtracts fixed, published penalties per finding.
 * There is no randomness and no opaque "AI" scoring — given the same findings
 * the score is always identical, and every deduction is itemized with a reason.
 */
import type {
  CategoryScore,
  Finding,
  HealthScore,
  RuleCategory,
  ScoreDeduction,
  Severity,
} from '../types';

/** Points removed per finding, by severity. Published so the score is auditable. */
export const SEVERITY_POINTS: Record<Severity, number> = {
  high: 15,
  medium: 8,
  low: 3,
};

/** No single category may remove more than this many points from the total. */
export const CATEGORY_CAP = 40;

export const CATEGORY_LABELS: Record<RuleCategory, string> = {
  structure: '結構 Structure',
  completeness: '完整性 Completeness',
  consistency: '一致性 Consistency',
  formula: '公式與維護 Formula & maintenance',
  metadata: '中繼資料 Metadata',
  integrity: '資料完整性 Data integrity',
};

const ALL_CATEGORIES: RuleCategory[] = [
  'structure',
  'completeness',
  'consistency',
  'formula',
  'metadata',
  'integrity',
];

const SEVERITY_LABEL: Record<Severity, string> = {
  high: '嚴重',
  medium: '警告',
  low: '提示',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function gradeFor(total: number): { grade: string; gradeLabel: string } {
  if (total >= 90) return { grade: 'A', gradeLabel: '優' };
  if (total >= 75) return { grade: 'B', gradeLabel: '良' };
  if (total >= 60) return { grade: 'C', gradeLabel: '尚可' };
  if (total >= 40) return { grade: 'D', gradeLabel: '待改善' };
  return { grade: 'F', gradeLabel: '需重整' };
}

export function computeScore(findings: Finding[]): HealthScore {
  const deductions: ScoreDeduction[] = findings.map((f) => ({
    ruleId: f.ruleId,
    ruleName: f.ruleName,
    category: f.category,
    severity: f.severity,
    points: SEVERITY_POINTS[f.severity],
    reason: `${f.ruleId}（${SEVERITY_LABEL[f.severity]}）：${f.message}`,
  }));

  // Sum raw points per category, then apply the per-category cap.
  const rawByCategory = new Map<RuleCategory, number>();
  for (const d of deductions) {
    rawByCategory.set(d.category, (rawByCategory.get(d.category) ?? 0) + d.points);
  }

  const categories: CategoryScore[] = ALL_CATEGORIES.map((category) => {
    const raw = rawByCategory.get(category) ?? 0;
    const deducted = Math.min(raw, CATEGORY_CAP);
    return {
      category,
      label: CATEGORY_LABELS[category],
      deducted,
      score: clamp(100 - deducted, 0, 100),
    };
  });

  const totalDeducted = categories.reduce((sum, c) => sum + c.deducted, 0);
  const total = clamp(100 - totalDeducted, 0, 100);
  const { grade, gradeLabel } = gradeFor(total);

  return { total, grade, gradeLabel, categories, deductions };
}

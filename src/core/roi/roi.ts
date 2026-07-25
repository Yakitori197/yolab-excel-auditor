/**
 * Automation ROI estimator.
 *
 * Deliberately decoupled from any uploaded file — it works purely from a small
 * questionnaire so the estimate never depends on (or exposes) real data.
 *
 * Every output is a transparent arithmetic result. It is an estimate, not a
 * guarantee, and the UI must present it as such.
 */

export interface RoiInputs {
  /** 每週整理次數 — times the task is done per week. */
  timesPerWeek: number;
  /** 每次耗費分鐘 — minutes spent each time. */
  minutesPerTime: number;
  /** 執行人數 — number of people doing it. */
  people: number;
  /** 每小時人力成本 — fully-loaded hourly labour cost. */
  hourlyCost: number;
  /** 預估可自動化比例 (0–100) — share of the effort that could be automated. */
  automatablePercent: number;
}

export interface RoiResult {
  monthlyHours: number;
  monthlyCost: number;
  savedHours: number;
  savedCost: number;
  remainingHours: number;
  remainingCost: number;
  assumptions: {
    weeksPerMonth: number;
    inputs: RoiInputs;
  };
  isEstimate: true;
  disclaimer: string;
}

/** Average weeks per month (52 weeks / 12 months). */
export const WEEKS_PER_MONTH = 52 / 12;

export const ROI_DISCLAIMER =
  '此為粗略估算，非保證結果；實際節省取決於流程複雜度、資料品質與導入方式。' +
  ' / Rough estimate only — not a guaranteed outcome.';

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function estimateRoi(inputs: RoiInputs): RoiResult {
  const timesPerWeek = nonNegative(inputs.timesPerWeek);
  const minutesPerTime = nonNegative(inputs.minutesPerTime);
  const people = nonNegative(inputs.people);
  const hourlyCost = nonNegative(inputs.hourlyCost);
  const automatablePercent = clampPercent(inputs.automatablePercent);

  const monthlyMinutes = timesPerWeek * minutesPerTime * people * WEEKS_PER_MONTH;
  const monthlyHours = monthlyMinutes / 60;
  const monthlyCost = monthlyHours * hourlyCost;

  const factor = automatablePercent / 100;
  const savedHours = monthlyHours * factor;
  const savedCost = monthlyCost * factor;

  return {
    monthlyHours: round2(monthlyHours),
    monthlyCost: round2(monthlyCost),
    savedHours: round2(savedHours),
    savedCost: round2(savedCost),
    remainingHours: round2(monthlyHours - savedHours),
    remainingCost: round2(monthlyCost - savedCost),
    assumptions: {
      weeksPerMonth: round2(WEEKS_PER_MONTH),
      inputs: {
        timesPerWeek,
        minutesPerTime,
        people,
        hourlyCost,
        automatablePercent,
      },
    },
    isEstimate: true,
    disclaimer: ROI_DISCLAIMER,
  };
}

import { describe, expect, it } from 'vitest';
import { computeScore } from '../scoring/score';
import type { Finding, RuleCategory, Severity } from '../types';

function finding(severity: Severity, category: RuleCategory = 'structure'): Finding {
  return {
    ruleId: 'R000',
    ruleName: 'test rule',
    category,
    severity,
    message: 'test message',
    impact: 'test impact',
    recommendation: 'test recommendation',
    location: { sheet: 'Sheet1' },
  };
}

describe('health scoring', () => {
  it('is deterministic — identical findings produce identical scores', () => {
    const findings = [finding('high'), finding('medium', 'consistency'), finding('low', 'formula')];
    const a = computeScore(findings);
    const b = computeScore(findings);
    expect(a).toEqual(b);
  });

  it('returns a perfect score when there are no findings', () => {
    const score = computeScore([]);
    expect(score.total).toBe(100);
    expect(score.grade).toBe('A');
  });

  it('penalizes high severity more than low severity', () => {
    const high = computeScore([finding('high')]).total;
    const low = computeScore([finding('low')]).total;
    expect(high).toBeLessThan(low);
    expect(low).toBe(97);
    expect(high).toBe(85);
  });

  it('never drops below zero even with many severe findings', () => {
    const categories: RuleCategory[] = [
      'structure',
      'completeness',
      'consistency',
      'formula',
      'metadata',
      'integrity',
    ];
    const many = categories.flatMap((c) => [
      finding('high', c),
      finding('high', c),
      finding('high', c),
      finding('high', c),
    ]);
    const score = computeScore(many);
    expect(score.total).toBe(0);
    expect(score.grade).toBe('F');
  });

  it('caps the deduction any single category can contribute', () => {
    const structureHeavy = Array.from({ length: 10 }, () => finding('high', 'structure'));
    const score = computeScore(structureHeavy);
    const structure = score.categories.find((c) => c.category === 'structure');
    expect(structure?.deducted).toBe(40); // capped, not 150
    expect(score.total).toBe(60);
  });
});

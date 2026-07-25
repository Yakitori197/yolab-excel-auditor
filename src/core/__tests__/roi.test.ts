import { describe, expect, it } from 'vitest';
import { estimateRoi } from '../roi/roi';

describe('ROI estimator', () => {
  it('computes monthly hours, cost and savings for known inputs', () => {
    const result = estimateRoi({
      timesPerWeek: 5,
      minutesPerTime: 30,
      people: 2,
      hourlyCost: 500,
      automatablePercent: 60,
    });
    expect(result.monthlyHours).toBe(21.67);
    expect(result.monthlyCost).toBe(10833.33);
    expect(result.savedHours).toBe(13);
    expect(result.savedCost).toBe(6500);
    expect(result.remainingCost).toBe(4333.33);
    expect(result.isEstimate).toBe(true);
    expect(result.disclaimer).toContain('估算');
  });

  it('clamps negative inputs to zero', () => {
    const result = estimateRoi({
      timesPerWeek: -1,
      minutesPerTime: -5,
      people: -2,
      hourlyCost: -100,
      automatablePercent: -10,
    });
    expect(result.monthlyHours).toBe(0);
    expect(result.monthlyCost).toBe(0);
    expect(result.savedCost).toBe(0);
  });

  it('clamps the automatable percentage to at most 100', () => {
    const result = estimateRoi({
      timesPerWeek: 1,
      minutesPerTime: 60,
      people: 1,
      hourlyCost: 100,
      automatablePercent: 150,
    });
    // With 100% automatable, saved equals the full monthly figures.
    expect(result.savedHours).toBe(result.monthlyHours);
    expect(result.savedCost).toBe(result.monthlyCost);
    expect(result.assumptions.inputs.automatablePercent).toBe(100);
  });
});

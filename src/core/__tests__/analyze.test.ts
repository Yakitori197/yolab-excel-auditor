import { describe, expect, it } from 'vitest';
import { analyzeWorkbook } from '../analyze';
import { makeSheet, makeWorkbook, sBlank, sNum, sText } from './helpers';

describe('analyzeWorkbook integration', () => {
  it('handles an empty workbook without crashing', () => {
    const result = analyzeWorkbook(makeWorkbook([]));
    expect(result.findings).toHaveLength(0);
    expect(result.score.total).toBe(100);
    expect(result.sheetCount).toBe(0);
  });

  it('handles an empty sheet without crashing', () => {
    const sheet = makeSheet('Empty', []);
    const result = analyzeWorkbook(makeWorkbook([sheet]));
    expect(result.findings).toHaveLength(0);
    expect(result.score.total).toBe(100);
  });

  it('audits a multi-sheet workbook and aggregates findings per sheet', () => {
    const clean = makeSheet('Clean', [
      [sText('SKU'), sText('Qty')],
      [sText('A1'), sNum(10)],
      [sText('A2'), sNum(20)],
    ]);
    const messy = makeSheet('Messy', [
      [sText('SKU'), sText('SKU'), sBlank()],
      [sText('A1'), sText('x '), sBlank()],
      [sText('A1'), sText('x '), sBlank()],
    ]);
    const hidden = makeSheet('Hidden', [[sText('a')], [sNum(1)]], { hidden: true });

    const result = analyzeWorkbook(makeWorkbook([clean, messy, hidden]));

    expect(result.sheetCount).toBe(3);
    expect(result.sheetSummaries).toHaveLength(3);
    expect(result.score.total).toBeLessThan(100);

    const sheetsWithFindings = new Set(result.findings.map((f) => f.location.sheet));
    expect(sheetsWithFindings.has('Messy')).toBe(true);
    expect(sheetsWithFindings.has('Hidden')).toBe(true);
    expect(sheetsWithFindings.has('Clean')).toBe(false);

    // Findings are ordered most-severe first.
    const severities = result.findings.map((f) => f.severity);
    const firstLow = severities.indexOf('low');
    const lastHigh = severities.lastIndexOf('high');
    if (firstLow !== -1 && lastHigh !== -1) expect(lastHigh).toBeLessThan(firstLow);
  });

  it('produces a stable result across repeated runs', () => {
    const sheet = makeSheet('S', [
      [sText('id'), sText('v')],
      [sNum(1), sText('a ')],
      [sNum(1), sText('a ')],
    ]);
    const wb = makeWorkbook([sheet]);
    expect(analyzeWorkbook(wb)).toEqual(analyzeWorkbook(wb));
  });
});

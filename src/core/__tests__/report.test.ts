import { describe, expect, it } from 'vitest';
import { analyzeWorkbook } from '../analyze';
import { buildReport, toReportJson } from '../report/buildReport';
import { estimateRoi } from '../roi/roi';
import { makeSheet, makeWorkbook, sText } from './helpers';

const SENTINEL = 'ZZTOPSECRETVALUE';

function messyWorkbook() {
  const sheet = makeSheet('Sheet1', [
    [sText('SKU'), sText('Customer'), sText('Amount')],
    [sText('A001'), sText(`${SENTINEL} `), sText('100')],
    [sText('A001'), sText(`${SENTINEL} `), sText('100')],
    [sText('A002'), sText('Bob'), sText('200')],
    [sText('A003'), sText('Carol'), sText('300')],
    [sText('A004'), sText('Dan'), sText('400')],
  ]);
  return makeWorkbook([sheet], {
    fileType: 'xlsx',
    fileName: 'C:\\Users\\alice\\Documents\\secret-data.xlsx',
  });
}

describe('report privacy', () => {
  it('excludes raw data values from the serialized report', () => {
    const result = analyzeWorkbook(messyWorkbook());
    const report = buildReport(result, { generatedAt: '2026-07-25T00:00:00.000Z' });
    const json = toReportJson(report);

    expect(report.findings.length).toBeGreaterThan(0);
    expect(json).not.toContain(SENTINEL);
  });

  it('strips absolute filesystem paths to a bare basename', () => {
    const result = analyzeWorkbook(messyWorkbook());
    const report = buildReport(result, { generatedAt: '2026-07-25T00:00:00.000Z' });
    const json = toReportJson(report);

    expect(report.file.name).toBe('secret-data.xlsx');
    expect(json).not.toContain('alice');
    expect(json).not.toContain('Documents');
    expect(json).not.toMatch(/[A-Za-z]:\\\\/);
  });

  it('includes metadata, score and optional ROI', () => {
    const result = analyzeWorkbook(messyWorkbook());
    const roi = estimateRoi({
      timesPerWeek: 3,
      minutesPerTime: 20,
      people: 1,
      hourlyCost: 400,
      automatablePercent: 50,
    });
    const report = buildReport(result, { roi, generatedAt: '2026-07-25T00:00:00.000Z' });

    expect(report.meta.privacyNote).toBeTruthy();
    expect(report.score.total).toBeLessThan(100);
    expect(report.roi).not.toBeNull();
    expect(report.roi?.isEstimate).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { blankCellRatioRule, emptyRowsColumnsRule } from '../rules/completeness';
import { makeSheet, makeWorkbook, sBlank, sNum, sText } from './helpers';

describe('R001 blank cell ratio', () => {
  it('flags a sheet with a high proportion of blank cells', () => {
    const sheet = makeSheet('Inventory', [
      [sText('SKU'), sText('Qty')],
      [sText('A1'), sBlank()],
      [sText('A2'), sBlank()],
      [sText('A3'), sBlank()],
    ]);
    const findings = blankCellRatioRule.evaluate(sheet, makeWorkbook([sheet]));
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe('R001');
    expect(findings[0].severity).toBe('high');
    expect(findings[0].metrics).toMatchObject({ blankCells: 3, totalCells: 6 });
  });

  it('does not flag a fully populated sheet', () => {
    const sheet = makeSheet('Clean', [
      [sText('SKU'), sText('Qty')],
      [sText('A1'), sNum(10)],
      [sText('A2'), sNum(20)],
    ]);
    expect(blankCellRatioRule.evaluate(sheet, makeWorkbook([sheet]))).toHaveLength(0);
  });
});

describe('R002 empty rows and columns', () => {
  it('detects fully empty rows and columns', () => {
    const sheet = makeSheet('Sheet1', [
      [sText('A'), sText('B'), sBlank()],
      [sNum(1), sNum(2), sBlank()],
      [sBlank(), sBlank(), sBlank()],
      [sNum(3), sNum(4), sBlank()],
    ]);
    const findings = emptyRowsColumnsRule.evaluate(sheet, makeWorkbook([sheet]));
    expect(findings).toHaveLength(1);
    expect(findings[0].metrics).toMatchObject({ emptyRows: 1, emptyColumns: 1 });
    expect(findings[0].location.rows).toContain(3);
  });

  it('returns nothing for a dense sheet', () => {
    const sheet = makeSheet('Dense', [
      [sText('A'), sText('B')],
      [sNum(1), sNum(2)],
    ]);
    expect(emptyRowsColumnsRule.evaluate(sheet, makeWorkbook([sheet]))).toHaveLength(0);
  });
});

import { describe, expect, it } from 'vitest';
import { formulaErrorsRule, formulaMaintenanceRule } from '../rules/formula';
import { hiddenSheetRule, largeSheetRule } from '../rules/metadata';
import { duplicateIdRule } from '../rules/integrity';
import { makeSheet, makeWorkbook, sError, sFormula, sNum, sText } from './helpers';

describe('R009 formula error values', () => {
  it('flags cells containing error tokens', () => {
    const sheet = makeSheet('Calc', [
      [sText('result')],
      [sError('#DIV/0!')],
      [sFormula('B1/0', sError('#DIV/0!'))],
    ]);
    const findings = formulaErrorsRule.evaluate(sheet, makeWorkbook([sheet]));
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('high');
    expect(findings[0].metrics).toMatchObject({ errorCells: 2 });
  });
});

describe('R010 formula maintenance risk', () => {
  it('flags sheets with many formulas', () => {
    const rows = [[sText('total')]];
    for (let i = 0; i < 120; i += 1) rows.push([sFormula(`A${i + 2}*2`, sNum(i))]);
    const sheet = makeSheet('Calc', rows);
    const findings = formulaMaintenanceRule.evaluate(sheet, makeWorkbook([sheet]));
    expect(findings).toHaveLength(1);
    expect(findings[0].metrics?.formulaCells).toBe(120);
  });

  it('ignores sheets with few formulas', () => {
    const sheet = makeSheet('Calc', [[sText('total')], [sFormula('A2*2', sNum(1))]]);
    expect(formulaMaintenanceRule.evaluate(sheet, makeWorkbook([sheet]))).toHaveLength(0);
  });
});

describe('R012 hidden worksheet', () => {
  it('flags hidden sheets', () => {
    const sheet = makeSheet('Secret', [[sText('a')], [sNum(1)]], { hidden: true });
    expect(hiddenSheetRule.evaluate(sheet, makeWorkbook([sheet]))).toHaveLength(1);
  });

  it('ignores visible sheets', () => {
    const sheet = makeSheet('Visible', [[sText('a')], [sNum(1)]]);
    expect(hiddenSheetRule.evaluate(sheet, makeWorkbook([sheet]))).toHaveLength(0);
  });
});

describe('R013 oversized worksheet', () => {
  it('flags very large sheets as high severity', () => {
    const sheet = makeSheet('Big', [[sText('a')]], { rowCount: 250_000, columnCount: 5 });
    const findings = largeSheetRule.evaluate(sheet, makeWorkbook([sheet]));
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('high');
  });

  it('ignores normally sized sheets', () => {
    const sheet = makeSheet('Small', [[sText('a')], [sNum(1)]]);
    expect(largeSheetRule.evaluate(sheet, makeWorkbook([sheet]))).toHaveLength(0);
  });
});

describe('R014 duplicate unique identifiers', () => {
  it('flags duplicate values in a mostly-unique id column', () => {
    const sheet = makeSheet('Orders', [
      [sText('OrderID'), sText('Item')],
      [sText('A001'), sText('x')],
      [sText('A002'), sText('y')],
      [sText('A003'), sText('z')],
      [sText('A004'), sText('w')],
      [sText('A004'), sText('v')],
    ]);
    const findings = duplicateIdRule.evaluate(sheet, makeWorkbook([sheet]));
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('high');
    expect(findings[0].metrics).toMatchObject({ duplicateKeys: 1 });
  });

  it('does not flag a fully unique id column', () => {
    const sheet = makeSheet('Orders', [
      [sText('OrderID')],
      [sText('A001')],
      [sText('A002')],
      [sText('A003')],
      [sText('A004')],
      [sText('A005')],
    ]);
    expect(duplicateIdRule.evaluate(sheet, makeWorkbook([sheet]))).toHaveLength(0);
  });
});

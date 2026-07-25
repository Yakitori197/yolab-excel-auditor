import { describe, expect, it } from 'vitest';
import {
  dateFormatRule,
  mixedTypesRule,
  numbersAsTextRule,
  whitespaceRule,
} from '../rules/consistency';
import { makeSheet, makeWorkbook, sBlank, sNum, sText } from './helpers';

describe('R005 mixed column types', () => {
  it('flags a column mixing numbers and text', () => {
    const sheet = makeSheet('S', [
      [sText('value')],
      [sNum(1)],
      [sNum(2)],
      [sText('N/A')],
    ]);
    const findings = mixedTypesRule.evaluate(sheet, makeWorkbook([sheet]));
    expect(findings).toHaveLength(1);
    expect(findings[0].location.columns).toEqual(['value']);
  });

  it('does not flag a uniform numeric column', () => {
    const sheet = makeSheet('S', [[sText('value')], [sNum(1)], [sNum(2)], [sNum(3)]]);
    expect(mixedTypesRule.evaluate(sheet, makeWorkbook([sheet]))).toHaveLength(0);
  });
});

describe('R006 inconsistent date formats', () => {
  it('flags a column mixing date formats', () => {
    const sheet = makeSheet('S', [
      [sText('date')],
      [sText('2024-01-02')],
      [sText('01/02/2024')],
      [sText('2024-03-04')],
    ]);
    const findings = dateFormatRule.evaluate(sheet, makeWorkbook([sheet]));
    expect(findings).toHaveLength(1);
    expect(findings[0].location.columns).toEqual(['date']);
  });

  it('does not flag a consistently formatted date column', () => {
    const sheet = makeSheet('S', [
      [sText('date')],
      [sText('2024-01-02')],
      [sText('2024-03-04')],
    ]);
    expect(dateFormatRule.evaluate(sheet, makeWorkbook([sheet]))).toHaveLength(0);
  });
});

describe('R007 numbers stored as text', () => {
  it('flags numeric text columns in XLSX', () => {
    const sheet = makeSheet('S', [
      [sText('amount')],
      [sText('100')],
      [sText('200')],
      [sText('300')],
    ]);
    const findings = numbersAsTextRule.evaluate(sheet, makeWorkbook([sheet], { fileType: 'xlsx' }));
    expect(findings).toHaveLength(1);
    expect(findings[0].location.columns).toEqual(['amount']);
  });

  it('is skipped for CSV files (inherently text)', () => {
    const sheet = makeSheet('S', [
      [sText('amount')],
      [sText('100')],
      [sText('200')],
      [sText('300')],
    ]);
    expect(numbersAsTextRule.evaluate(sheet, makeWorkbook([sheet], { fileType: 'csv' }))).toHaveLength(
      0,
    );
  });

  it('does not flag leading-zero codes as numbers', () => {
    const sheet = makeSheet('S', [
      [sText('code')],
      [sText('007')],
      [sText('008')],
      [sText('009')],
    ]);
    expect(numbersAsTextRule.evaluate(sheet, makeWorkbook([sheet], { fileType: 'xlsx' }))).toHaveLength(
      0,
    );
  });
});

describe('R008 leading/trailing whitespace', () => {
  it('flags cells with surrounding whitespace', () => {
    const sheet = makeSheet('S', [[sText('name')], [sText('Apple ')], [sText('Banana')]]);
    const findings = whitespaceRule.evaluate(sheet, makeWorkbook([sheet]));
    expect(findings).toHaveLength(1);
    expect(findings[0].metrics).toMatchObject({ cells: 1 });
  });

  it('ignores clean and blank cells', () => {
    const sheet = makeSheet('S', [[sText('name')], [sText('Apple')], [sBlank()]]);
    expect(whitespaceRule.evaluate(sheet, makeWorkbook([sheet]))).toHaveLength(0);
  });
});

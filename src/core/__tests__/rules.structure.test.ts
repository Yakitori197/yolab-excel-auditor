import { describe, expect, it } from 'vitest';
import {
  duplicateRowsRule,
  headerQualityRule,
  mergedCellsRule,
} from '../rules/structure';
import { makeSheet, makeWorkbook, sBlank, sNum, sText } from './helpers';

describe('R003 duplicate rows', () => {
  it('flags identical data rows (case-insensitive, trimmed)', () => {
    const sheet = makeSheet('Orders', [
      [sText('id'), sText('name')],
      [sNum(1), sText('Apple')],
      [sNum(1), sText('apple ')],
      [sNum(2), sText('Banana')],
    ]);
    const findings = duplicateRowsRule.evaluate(sheet, makeWorkbook([sheet]));
    expect(findings).toHaveLength(1);
    expect(findings[0].metrics).toMatchObject({ duplicateGroups: 1, duplicateRows: 1 });
  });

  it('does not flag distinct rows', () => {
    const sheet = makeSheet('Orders', [
      [sText('id'), sText('name')],
      [sNum(1), sText('Apple')],
      [sNum(2), sText('Banana')],
    ]);
    expect(duplicateRowsRule.evaluate(sheet, makeWorkbook([sheet]))).toHaveLength(0);
  });
});

describe('R004 header quality', () => {
  it('flags duplicate and blank headers', () => {
    const sheet = makeSheet('Sheet', [
      [sText('Name'), sText('name'), sBlank()],
      [sNum(1), sNum(2), sNum(3)],
    ]);
    const findings = headerQualityRule.evaluate(sheet, makeWorkbook([sheet]));
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe('high');
    expect(findings[0].metrics).toMatchObject({ duplicateHeaders: 1, blankHeaders: 1 });
  });

  it('accepts clean unique headers', () => {
    const sheet = makeSheet('Sheet', [
      [sText('SKU'), sText('Quantity')],
      [sText('A1'), sNum(3)],
    ]);
    expect(headerQualityRule.evaluate(sheet, makeWorkbook([sheet]))).toHaveLength(0);
  });
});

describe('R011 merged cells', () => {
  it('flags merged ranges', () => {
    const sheet = makeSheet(
      'Sheet',
      [
        [sText('A'), sText('B')],
        [sNum(1), sNum(2)],
      ],
      { merges: ['A1:B1'] },
    );
    const findings = mergedCellsRule.evaluate(sheet, makeWorkbook([sheet]));
    expect(findings).toHaveLength(1);
    expect(findings[0].metrics).toMatchObject({ mergedRanges: 1 });
    expect(findings[0].location.ranges).toEqual(['A1:B1']);
  });
});

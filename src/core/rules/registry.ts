/**
 * Rule registry.
 *
 * Rules are plain `RuleDefinition` objects, so adding a new check is a matter of
 * implementing the interface and appending it here — no changes to the engine.
 */
import type { RuleDefinition } from '../types';
import { blankCellRatioRule, emptyRowsColumnsRule } from './completeness';
import { dateFormatRule, mixedTypesRule, numbersAsTextRule, whitespaceRule } from './consistency';
import { formulaErrorsRule, formulaMaintenanceRule } from './formula';
import { duplicateIdRule } from './integrity';
import { hiddenSheetRule, largeSheetRule } from './metadata';
import { duplicateRowsRule, headerQualityRule, mergedCellsRule } from './structure';

export const ruleRegistry: readonly RuleDefinition[] = [
  blankCellRatioRule,
  emptyRowsColumnsRule,
  duplicateRowsRule,
  headerQualityRule,
  mixedTypesRule,
  dateFormatRule,
  numbersAsTextRule,
  whitespaceRule,
  formulaErrorsRule,
  formulaMaintenanceRule,
  mergedCellsRule,
  hiddenSheetRule,
  largeSheetRule,
  duplicateIdRule,
];

export function getRuleById(id: string): RuleDefinition | undefined {
  return ruleRegistry.find((rule) => rule.id === id);
}

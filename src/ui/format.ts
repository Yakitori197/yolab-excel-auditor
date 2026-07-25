import type { Severity } from '../core';

const NUMBER_FMT = new Intl.NumberFormat('zh-Hant');
const MONEY_FMT = new Intl.NumberFormat('zh-Hant', { maximumFractionDigits: 2 });

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function formatNumber(n: number): string {
  return NUMBER_FMT.format(n);
}

export function formatMoney(n: number): string {
  return MONEY_FMT.format(n);
}

export const SEVERITY_LABEL: Record<Severity, { zh: string; en: string }> = {
  high: { zh: '嚴重', en: 'High' },
  medium: { zh: '警告', en: 'Medium' },
  low: { zh: '提示', en: 'Low' },
};

export const SEVERITY_ORDER: Severity[] = ['high', 'medium', 'low'];

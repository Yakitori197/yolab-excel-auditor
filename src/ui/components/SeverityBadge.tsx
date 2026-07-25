import type { Severity } from '../../core';
import { SEVERITY_LABEL } from '../format';

export function SeverityBadge({ severity }: { severity: Severity }) {
  const label = SEVERITY_LABEL[severity];
  return (
    <span className={`badge badge--${severity}`}>
      {label.zh}
      <span className="visually-hidden"> {label.en}</span>
    </span>
  );
}

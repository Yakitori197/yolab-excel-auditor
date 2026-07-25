import type { Finding } from '../../core';
import { SeverityBadge } from './SeverityBadge';

function Chips({ label, items }: { label: string; items?: Array<string | number> }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="finding__row">
      <dt>{label}</dt>
      <dd>
        {items.map((item, i) => (
          <span className="loc-chip" key={`${item}-${i}`}>
            {item}
          </span>
        ))}
      </dd>
    </div>
  );
}

export function FindingCard({ finding }: { finding: Finding }) {
  const { location } = finding;
  return (
    <article className={`finding finding--${finding.severity}`}>
      <div className="finding__head">
        <SeverityBadge severity={finding.severity} />
        <span className="badge badge--rule">{finding.ruleId}</span>
        <span className="finding__title">{finding.ruleName}</span>
      </div>

      <div className="finding__body">
        <p style={{ margin: 0 }}>{finding.message}</p>
        <dl style={{ margin: '0.4rem 0 0', display: 'grid', gap: '0.3rem' }}>
          <div className="finding__row">
            <dt>影響 Impact</dt>
            <dd>{finding.impact}</dd>
          </div>
          <div className="finding__row">
            <dt>建議 Advice</dt>
            <dd>{finding.recommendation}</dd>
          </div>
          <div className="finding__row">
            <dt>工作表 Sheet</dt>
            <dd>{location.sheet}</dd>
          </div>
          <Chips label="欄位 Columns" items={location.columns} />
          <Chips label="儲存格 Cells" items={location.cells} />
          <Chips label="列 Rows" items={location.rows} />
          <Chips label="範圍 Ranges" items={location.ranges} />
        </dl>
      </div>
    </article>
  );
}

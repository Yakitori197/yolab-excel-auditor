import type { HealthScore } from '../../core';
import { formatNumber } from '../format';
import { SeverityBadge } from './SeverityBadge';

function scoreColor(total: number): string {
  if (total >= 75) return 'var(--good)';
  if (total >= 40) return 'var(--sev-medium)';
  return 'var(--sev-high)';
}

export function HealthScorePanel({ score }: { score: HealthScore }) {
  return (
    <div className="stack">
      <div className="score">
        <div
          className="score__gauge"
          role="img"
          aria-label={`健康評分 ${score.total} 分，滿分 100，等級 ${score.grade}（${score.gradeLabel}）`}
        >
          <div className="score__number" style={{ color: scoreColor(score.total) }}>
            {score.total}
            <span className="muted" style={{ fontSize: '1rem', fontWeight: 500 }}>
              {' '}
              / 100
            </span>
          </div>
          <div className="score__grade">
            等級 {score.grade}・{score.gradeLabel}
          </div>
        </div>

        <div className="bars" aria-label="各分類分數">
          {score.categories.map((c) => (
            <div className="bar__row" key={c.category}>
              <span>{c.label}</span>
              <span className="bar__track">
                <span
                  className="bar__fill"
                  style={{ width: `${c.score}%`, background: scoreColor(c.score) }}
                />
              </span>
              <span className="muted">{c.score}</span>
            </div>
          ))}
        </div>
      </div>

      {score.deductions.length > 0 ? (
        <details>
          <summary>
            扣分明細 Deductions（{score.deductions.length}）— 分數如何計算
          </summary>
          <p className="small muted" style={{ marginTop: '0.6rem' }}>
            起始 100 分。每項問題依嚴重程度固定扣分（嚴重 15、警告 8、提示 3），每個分類最多扣 40 分。
          </p>
          <ul className="stack" style={{ paddingLeft: '1.1rem' }}>
            {score.deductions.map((d, i) => (
              <li key={`${d.ruleId}-${i}`} style={{ marginTop: '0.4rem' }}>
                <span className="row">
                  <span className="badge badge--rule">{d.ruleId}</span>
                  <SeverityBadge severity={d.severity} />
                  <strong>−{formatNumber(d.points)}</strong>
                </span>
                <div className="small muted">{d.reason}</div>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="muted">沒有發現問題，維持滿分。No issues found — perfect score.</p>
      )}
    </div>
  );
}

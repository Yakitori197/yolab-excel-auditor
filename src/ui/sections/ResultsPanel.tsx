import { useMemo, useState } from 'react';
import type { AnalysisResult, Severity } from '../../core';
import { formatBytes, formatNumber, SEVERITY_LABEL } from '../format';
import { DownloadIcon, PrinterIcon, TrashIcon } from '../components/icons';
import { FindingCard } from '../components/FindingCard';
import { HealthScorePanel } from '../components/HealthScorePanel';

interface Props {
  analysis: AnalysisResult;
  warning: string | null;
  onClear: () => void;
  onDownloadJson: () => void;
  onPrint: () => void;
}

const ALL = '__all__';

export function ResultsPanel({ analysis, warning, onClear, onDownloadJson, onPrint }: Props) {
  const [severity, setSeverity] = useState<string>(ALL);
  const [sheet, setSheet] = useState<string>(ALL);
  const [rule, setRule] = useState<string>(ALL);

  const ruleOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of analysis.findings) map.set(f.ruleId, f.ruleName);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [analysis.findings]);

  const filtered = useMemo(
    () =>
      analysis.findings.filter(
        (f) =>
          (severity === ALL || f.severity === severity) &&
          (sheet === ALL || f.location.sheet === sheet) &&
          (rule === ALL || f.ruleId === rule),
      ),
    [analysis.findings, severity, sheet, rule],
  );

  const totals = useMemo(() => {
    const counts: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
    for (const f of analysis.findings) counts[f.severity] += 1;
    return counts;
  }, [analysis.findings]);

  return (
    <div className="stack">
      {/* File summary */}
      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 className="section__title" style={{ margin: 0 }}>
            分析結果 Results
          </h2>
          <div className="row no-print">
            <button type="button" className="btn" onClick={onDownloadJson}>
              <DownloadIcon /> 下載 JSON
            </button>
            <button type="button" className="btn" onClick={onPrint}>
              <PrinterIcon /> 列印／PDF
            </button>
            <button type="button" className="btn btn--ghost" onClick={onClear}>
              <TrashIcon /> 清除結果
            </button>
          </div>
        </div>

        {warning ? (
          <div className="alert alert--warning" role="status">
            {warning}
          </div>
        ) : null}

        <dl className="meta-grid">
          <div>
            <dt>檔名 File</dt>
            <dd>{analysis.fileName}</dd>
          </div>
          <div>
            <dt>大小 Size</dt>
            <dd>{formatBytes(analysis.fileSizeBytes)}</dd>
          </div>
          <div>
            <dt>類型 Type</dt>
            <dd>{analysis.fileType.toUpperCase()}</dd>
          </div>
          <div>
            <dt>工作表數 Sheets</dt>
            <dd>{formatNumber(analysis.sheetCount)}</dd>
          </div>
          <div>
            <dt>問題總數 Findings</dt>
            <dd>{formatNumber(analysis.findings.length)}</dd>
          </div>
        </dl>

        <p className="small muted" style={{ margin: 0 }}>
          報告與匯出僅含工作表、欄位與位置資訊，不含完整原始資料列。 Reports include locations and counts
          only — never full data rows.
        </p>
      </div>

      {/* Health score */}
      <section className="card stack" aria-labelledby="score-title">
        <h2 id="score-title" className="section__title">
          健康評分 Health score
        </h2>
        <HealthScorePanel score={analysis.score} />
      </section>

      {/* Sheet overview */}
      <section className="card stack" aria-labelledby="sheets-title">
        <h2 id="sheets-title" className="section__title">
          工作表總覽 Sheets
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="sheet-table">
            <thead>
              <tr>
                <th scope="col">工作表 Sheet</th>
                <th scope="col">列 Rows</th>
                <th scope="col">欄 Cols</th>
                <th scope="col">範圍 Range</th>
                <th scope="col">狀態 State</th>
                <th scope="col">問題 Findings</th>
              </tr>
            </thead>
            <tbody>
              {analysis.sheetSummaries.map((s) => (
                <tr key={s.name}>
                  <th scope="row">{s.name}</th>
                  <td>{formatNumber(s.rowCount)}</td>
                  <td>{formatNumber(s.columnCount)}</td>
                  <td className="mono">{s.range || '—'}</td>
                  <td>
                    {s.hidden ? <span className="badge badge--medium">隱藏 Hidden</span> : '一般'}
                  </td>
                  <td>
                    {s.findingCounts.high + s.findingCounts.medium + s.findingCounts.low === 0 ? (
                      <span className="badge badge--good">無 None</span>
                    ) : (
                      <span className="small">
                        {s.findingCounts.high}／{s.findingCounts.medium}／{s.findingCounts.low}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          問題欄格式為 嚴重／警告／提示（High／Medium／Low）。
        </p>
      </section>

      {/* Findings */}
      <section className="card stack" aria-labelledby="findings-title">
        <h2 id="findings-title" className="section__title">
          問題明細 Findings（{filtered.length}／{analysis.findings.length}）
        </h2>

        <div className="row">
          {(['high', 'medium', 'low'] as Severity[]).map((sev) => (
            <span className={`badge badge--${sev}`} key={sev}>
              {SEVERITY_LABEL[sev].zh} {totals[sev]}
            </span>
          ))}
        </div>

        {analysis.findings.length === 0 ? (
          <p className="muted">
            太好了，沒有發現任何問題！ No data-quality issues found — your file looks healthy.
          </p>
        ) : (
          <>
            <div className="filters no-print">
              <div className="field">
                <label htmlFor="filter-severity">嚴重程度 Severity</label>
                <select
                  id="filter-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <option value={ALL}>全部 All</option>
                  <option value="high">嚴重 High</option>
                  <option value="medium">警告 Medium</option>
                  <option value="low">提示 Low</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="filter-sheet">工作表 Sheet</label>
                <select id="filter-sheet" value={sheet} onChange={(e) => setSheet(e.target.value)}>
                  <option value={ALL}>全部 All</option>
                  {analysis.sheetSummaries.map((s) => (
                    <option value={s.name} key={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="filter-rule">規則 Rule</label>
                <select id="filter-rule" value={rule} onChange={(e) => setRule(e.target.value)}>
                  <option value={ALL}>全部 All</option>
                  {ruleOptions.map(([id, name]) => (
                    <option value={id} key={id}>
                      {id}・{name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="muted">目前篩選條件下沒有符合的問題。No findings match the current filters.</p>
            ) : (
              <div>
                {filtered.map((f, i) => (
                  <FindingCard finding={f} key={`${f.ruleId}-${f.location.sheet}-${i}`} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

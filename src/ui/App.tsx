import { useMemo, useRef, useState } from 'react';
import { analyzeWorkbook, buildReport, estimateRoi, toReportJson, WorkbookParseError } from '../core';
import type { AnalysisResult, RoiInputs } from '../core';
import { APP_NAME_ZH, APP_VERSION, REPO_URL, YOLAB_SITE } from '../appInfo';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LogoIcon } from './components/icons';
import { createLatestGate } from './latestGate';
import { Hero } from './sections/Hero';
import { UploadPanel } from './sections/UploadPanel';
import { ResultsPanel } from './sections/ResultsPanel';
import { RoiCalculator } from './sections/RoiCalculator';
import { RuleCatalog } from './sections/RuleCatalog';

const DEFAULT_ROI: RoiInputs = {
  timesPerWeek: 5,
  minutesPerTime: 30,
  people: 1,
  hourlyCost: 500,
  automatablePercent: 60,
};

export function App() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisId, setAnalysisId] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [roiInputs, setRoiInputs] = useState<RoiInputs>(DEFAULT_ROI);

  // "Latest run wins" guard so a slow older analysis cannot overwrite a newer one.
  const gateRef = useRef(createLatestGate());

  const roiResult = useMemo(() => estimateRoi(roiInputs), [roiInputs]);

  async function handleFile(file: File): Promise<void> {
    const runId = gateRef.current.begin();
    setError(null);
    setWarning(null);
    setBusy(true);
    try {
      // The XLSX parser (SheetJS) is code-split and loaded only when a file is
      // actually analysed, keeping the initial page load small.
      const { parseFile } = await import('../core/workbook/parseWorkbook');
      const { workbook, warning: parseWarning } = await parseFile(file);
      if (!gateRef.current.isLatest(runId)) return; // superseded by a newer upload
      setAnalysis(analyzeWorkbook(workbook));
      setAnalysisId(runId);
      setWarning(parseWarning ?? null);
    } catch (err) {
      if (!gateRef.current.isLatest(runId)) return;
      setAnalysis(null);
      setError(
        err instanceof WorkbookParseError
          ? err.message
          : '無法分析這個檔案，請確認檔案格式後再試一次。Could not analyse this file.',
      );
    } finally {
      if (gateRef.current.isLatest(runId)) setBusy(false);
    }
  }

  function handleClear(): void {
    // Invalidate any in-flight analysis so it cannot populate after clearing,
    // then clear the in-memory result. The user's original file is untouched.
    gateRef.current.begin();
    setAnalysis(null);
    setWarning(null);
    setError(null);
    setBusy(false);
  }

  function handleDownloadJson(): void {
    if (!analysis) return;
    const report = buildReport(analysis, {
      roi: roiResult,
      generatedAt: new Date().toISOString(),
    });
    const blob = new Blob([toReportJson(report)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const base = report.file.name.replace(/\.[^.]+$/, '') || 'workbook';
    anchor.href = url;
    anchor.download = `${base}-audit.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function handlePrint(): void {
    window.print();
  }

  return (
    <ErrorBoundary>
      <a className="skip-link" href="#main">
        跳到主要內容 Skip to content
      </a>

      <header className="site-header">
        <div className="container site-header__inner">
          <a className="brand" href="./">
            <LogoIcon />
            <span>
              {APP_NAME_ZH}
              <span className="brand__sub"> · YoLab Excel Auditor</span>
            </span>
          </a>
          <nav aria-label="主要導覽">
            <a href="#tool">開始分析</a>
            <a href="#roi">效益估算</a>
            <a href="#rules">健檢規則</a>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main id="main">
        <Hero />

        <section className="section" id="tool" aria-labelledby="tool-title">
          <div className="container stack">
            <h2 id="tool-title" className="section__title">
              開始分析 Analyse your file
            </h2>
            <UploadPanel onFile={handleFile} busy={busy} />

            {error ? (
              <div className="alert alert--error" role="alert">
                {error}
              </div>
            ) : null}

            {analysis ? (
              <ResultsPanel
                key={analysisId}
                analysis={analysis}
                warning={warning}
                onClear={handleClear}
                onDownloadJson={handleDownloadJson}
                onPrint={handlePrint}
              />
            ) : null}
          </div>
        </section>

        <section className="section" id="roi" aria-labelledby="roi-title">
          <div className="container stack">
            <h2 id="roi-title" className="section__title">
              自動化效益估算 Automation ROI
            </h2>
            <p className="muted">
              這份問卷與您的檔案內容完全分開，僅用來估算目前的人工投入與可能的自動化效益。
            </p>
            <div className="card">
              <RoiCalculator inputs={roiInputs} onChange={setRoiInputs} result={roiResult} />
            </div>
          </div>
        </section>

        <section className="section" id="rules" aria-labelledby="rules-title">
          <div className="container stack">
            <h2 id="rules-title" className="section__title">
              健檢規則 Health checks
            </h2>
            <p className="muted">
              以下 14 項規則皆可獨立測試、判斷透明，並會標示嚴重程度、影響範圍與建議處理方式。
            </p>
            <RuleCatalog />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container site-footer__inner">
          <span>
            {APP_NAME_ZH} v{APP_VERSION} · 隱私優先，本機處理。
          </span>
          <span>
            <a href={YOLAB_SITE} target="_blank" rel="noopener noreferrer">
              YoLab 軟體開發工作室
            </a>
            {' · '}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              原始碼 Source
            </a>
            {' · MIT License'}
          </span>
        </div>
      </footer>
    </ErrorBoundary>
  );
}

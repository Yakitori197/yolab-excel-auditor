import { YOLAB_SITE } from '../../appInfo';
import { CheckIcon, ShieldCheckIcon } from '../components/icons';

const FEATURES = [
  '支援 .xlsx 與 .csv，拖放或選擇檔案 · XLSX & CSV',
  '14 項資料品質健檢：空白、重複、型別、公式錯誤、隱藏工作表…',
  '透明可解釋的 0–100 健康評分，清楚列出扣分原因',
  '自動化效益（ROI）估算，估算每月可省的工時與成本',
  '可下載 JSON 摘要、可列印／另存 PDF',
];

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container">
        <div className="hero__grid">
          <div className="stack">
            <div>
              <span className="hero__eyebrow">隱私優先 · 本機處理 · 開源</span>
              <h1 id="hero-title">Excel／CSV 資料品質健檢</h1>
              <p className="hero__lead">
                為小型企業打造的隱私優先資料品質健檢工具。上傳您的試算表，立即找出空白、重複、型別不一致與公式錯誤等問題，並取得可解釋的健康評分。
              </p>
              <p className="muted small">
                Privacy-first Excel &amp; CSV data quality auditor for small businesses. Everything
                runs locally in your browser.
              </p>
            </div>

            <ul className="feature-list">
              {FEATURES.map((f) => (
                <li key={f}>
                  <CheckIcon />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <p className="small">
              由{' '}
              <a href={YOLAB_SITE} target="_blank" rel="noopener noreferrer">
                YoLab 軟體開發工作室
              </a>{' '}
              製作與維護。
            </p>
          </div>

          <div className="privacy-banner" role="note">
            <ShieldCheckIcon />
            <div>
              <strong>檔案不會離開您的裝置</strong>
              <span>
                Your files never leave your device. 所有解析與分析都在您的瀏覽器本機完成，不會上傳到任何伺服器；重新整理頁面後資料即會消失。
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

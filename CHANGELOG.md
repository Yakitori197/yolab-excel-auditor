# 變更紀錄 · Changelog

本專案的所有重要變更都會記錄於此。
格式參考 [Keep a Changelog](https://keepachangelog.com/)，版本遵循 [Semantic Versioning](https://semver.org/)。

## [Unreleased]

> 尚未發佈正式版本（未 tag）。以下為目前 `main` 上已完成的內容，將於首個正式 tag 時整理為 `1.0.0`。

### Added
- Playwright 桌面／手機瀏覽器測試，覆蓋正式 build 的子路徑、上傳／拖放、篩選、匯出、清除、錯誤復原與列印樣式。
- 使用合成資料的可重建首頁與報告截圖，直接顯示於 README。
- 首個版本的功能集：隱私優先的 Excel／CSV 資料品質健檢工具。
- 檔案匯入：支援 `.xlsx` 與 `.csv`，可拖放或選擇檔案；顯示檔名、大小、工作表數與資料範圍。
- 14 項資料品質健檢（R001–R014），涵蓋完整性、結構、一致性、公式與維護、中繼資料、資料完整性。
- 透明可解釋的 0–100 健康評分，含各分類分數與逐項扣分原因。
- 自動化效益（ROI）估算問卷（與檔案內容分離）。
- 報告：網頁摘要與詳細問題、依嚴重程度／工作表／規則篩選、可下載 JSON、可列印／另存 PDF。
- 完全虛構的示範資料與可稽核的產生腳本。
- 隱私設計：純本機處理、不上傳、不追蹤、不持久化、重新整理即清空。
- 無障礙：鍵盤操作、可見 focus、表單 label、明暗主題與色彩對比。
- 工程品質：React + TypeScript strict + Vite + Vitest + ESLint、GitHub Actions CI 與 GitHub Pages 部署工作流程。

### Security
- 更新開發依賴的相容修補版本；2026-10-16 完整與正式依賴 npm audit 均為零漏洞（後續以 CI 當次結果為準）。
- Pages 自動部署已停用，僅保留 main 的手動發布；push／合併 main 與 PR 仍執行 CI，不部署。手動發布也必須等待共用 CI 全部成功，並部署同一份已測試產物。
- **資源限制**：解析前即以嚴格的儲存格預算（單張工作表與整份工作簿）與工作表數量上限，依「宣告範圍」把關；超限直接以友善訊息拒絕，不靜默截斷，避免主執行緒 OOM。
- **格式驗證**：不只信任副檔名，會以檔案內容（magic bytes）辨識真實格式；改副檔名的 CSV／二進位檔會被拒絕。
- **CSV 解析異常**：檢查 PapaParse 錯誤與欄位數不一致，並以警告呈現，不靜默通過。
- **併發上傳**：分析進行中停用上傳與拖放，並以「最新請求」機制確保較舊的分析不會覆蓋較新的結果。
- **XLSX 解析套件來源**：改用 SheetJS 官方 CDN tarball（`xlsx@0.20.3`，Apache-2.0），以 lockfile 記錄完整性雜湊；避免使用已停更且含 CVE 的 npm `xlsx@0.18.5`。
- **相依稽核**：升級 Vite 8 / Vitest 4 / ESLint 10 後，**完整 `npm audit` 與 `npm audit --omit=dev` 皆為 0 個漏洞**。

### Fixed
- 每次成功分析後重設報告篩選條件，包含重複上傳同一個檔案，避免沿用舊條件而隱藏新報告的問題。
- 檔案輸入補上可存取名稱，方便輔助工具辨識。

[Unreleased]: https://github.com/yakitori197/yolab-excel-auditor/commits/main

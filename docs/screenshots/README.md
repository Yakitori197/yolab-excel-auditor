# 截圖 · Screenshots

此資料夾放置 README 使用的 UI 截圖。

## 如何擷取 · How to capture

1. 執行 `npm ci`、`npx playwright install chromium`、`npm run build`。
2. 執行 `npm run screenshots`。Playwright 會啟動正式 build 的預覽伺服器，載入 `samples/messy-inventory.xlsx`。
   - 這些檔案皆為**完全虛構的合成資料**，因此截圖天生就是去識別化的，不含任何真實資料。
3. 自動擷取以下畫面並存檔（1440 × 1100 視窗、淺色、zh-TW、停用動畫）：
   - `home.png` — 首頁（產品介紹、隱私橫幅、上傳區）。
   - `report.png` — 完整結果面板，含健康評分與 R003 重複列問題（篩選後擷取元素，圖片高度依內容而定）。
4. 流程定義於 `e2e/screenshots.spec.ts`；字型依作業系統而異。更新後請檢視兩張 PNG 再提交。

> ⚠️ 請務必只使用 `samples/` 的合成資料或您自行建立的虛構資料擷取截圖；請勿放入任何真實或敏感資料。

## 目前狀態 · Status

`home.png`、`report.png` 已由真實瀏覽器操作產生，README 直接顯示圖片。`public/og-image.png` 仍用作社群預覽 banner。

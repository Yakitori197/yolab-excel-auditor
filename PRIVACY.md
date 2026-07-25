# 隱私政策 · Privacy Policy

**YoLab Excel Auditor 的核心設計原則是：您的檔案永遠不會離開您的裝置。**
The core design principle of YoLab Excel Auditor is simple: **your files never leave your device.**

## 我們如何處理您的資料 · How your data is handled

- **完全本機處理**：所有檔案解析與分析都在您的瀏覽器中以 JavaScript 完成。工作簿內容**不會**被上傳、傳送或複製到任何伺服器。
- **無網路傳輸**：本工具在載入頁面後即可離線運作，不會為了分析而發出任何網路請求，也沒有任何資料上傳功能。
- **不持久化**：分析結果僅存在瀏覽器記憶體中。**重新整理或關閉頁面後即消失**。本工具不使用 `localStorage`、`sessionStorage`、`IndexedDB` 或 Cookie 來保存您的資料。
- **無追蹤**：沒有 Analytics、遙測、追蹤像素、廣告 SDK 或第三方腳本。
- **無帳號**：沒有登入、沒有後端、沒有資料庫、沒有 API Key。

## 匯出與報告 · Exports and reports

- 下載的 JSON 報告與可列印版面**只包含**：工作表名稱、欄位名稱、儲存格位置（如 `B12`）、範圍、統計數字與健康評分。
- 報告**不包含**完整的原始資料列，也**不包含**您電腦上的絕對檔案路徑（檔名會被縮減為單純的檔名）。
- 這些檔案由您的瀏覽器在本機產生，是否分享完全由您決定。

## 清除資料 · Clearing data

- 「清除結果 Clear」按鈕會清空目前在畫面上的分析結果。
- 此操作**只**清除瀏覽器記憶體中的分析資料，**不會**刪除、修改或觸碰您電腦上的原始檔案。

## 錯誤處理 · Error handling

- 本工具刻意避免將原始資料輸出到主控台（console）或錯誤訊息中。
- 錯誤邊界（Error Boundary）不會將任何錯誤內容轉送到外部。

## 第三方 · Third parties

- 開源相依套件（React、SheetJS、PapaParse）皆於建置時打包進靜態網站，執行時**不會**向第三方發出請求。
- 若您透過 GitHub Pages 造訪本網站，該存取受 GitHub 的隱私政策規範；本工具本身不會蒐集任何資料。

## 聯絡 · Contact

如對隱私設計有疑問，請於專案的 GitHub Issues 提出（請勿在 Issue 中貼上任何真實或敏感資料）。

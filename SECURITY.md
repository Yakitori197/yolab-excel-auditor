# 安全政策 · Security Policy

## 回報漏洞 · Reporting a vulnerability

若您發現安全性問題，請透過 GitHub 的 **Security → Report a vulnerability** 進行**私密回報**（private vulnerability reporting）。

> ⚠️ **請勿開立公開 Issue 或 Pull Request 來回報安全性問題**，以免在修補完成前公開揭露細節。
> Please do **not** open a public issue or pull request for security problems.

- **請勿**在回報中附上任何真實或敏感資料；如需示範，請使用完全虛構的合成資料。
- 請描述重現步驟、影響範圍與（若有）建議修正方向。

我們會盡力在合理時間內確認並回覆。

## 安全設計 · Security by design

本工具是純前端、靜態部署的應用，沒有後端、資料庫或使用者帳號，因此攻擊面相對有限。主要的安全考量與對策如下：

- **本機處理**：檔案不上傳，降低傳輸與伺服器端外洩風險。
- **輸入處理**：使用者提供的內容（工作表名稱、欄名、儲存格值）一律透過 React 的預設文字轉義呈現，**不使用** `dangerouslySetInnerHTML`。
- **不渲染未清理輸入**：分析報告只呈現位置與統計資訊，避免直接回顯大量原始輸入。
- **公式／匯出注入防護**：解析時公式僅作為文字讀取與判讀，**不會被執行**；匯出僅提供 JSON（值以 JSON 編碼），不產生會被試算表重新解讀為公式的 CSV/XLSX，因此避免了 CSV/公式注入。
- **檔案大小與讀取上限**：限制檔案大小（預設 20 MB）與每表讀取列／欄數，降低阻斷服務（DoS）風險。
- **穩健的錯誤處理**：損壞、空白、超大或不支援的檔案都會被友善攔截，並以錯誤邊界避免整頁崩潰。
- **最小相依**：相依套件維持精簡並選擇仍在維護的版本；建置產物（部署到 GitHub Pages 的內容）不包含開發期工具。

## 相依套件與稽核 · Dependencies & auditing

- 執行 `npm audit` 檢視相依套件漏洞。目前 **完整 `npm audit` 與 `npm audit --omit=dev` 皆為 0 個漏洞**；專案會誠實回報結果，不會為了讓數字好看而隱瞞。
- 正式執行期（會部署到瀏覽器）的相依：React、`xlsx`（SheetJS Community Edition）、PapaParse。

### XLSX 解析套件來源 · SheetJS provenance

為避免使用 npm 上已停止更新且含有已知 CVE 的 `xlsx@0.18.5`，本專案改用 **SheetJS 官方 CDN tarball**，並以 lockfile 記錄完整性雜湊供 `npm ci` 驗證與稽核：

- 套件與版本：`xlsx@0.20.3`（Apache-2.0）
- 官方來源：`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
- 完整性（Subresource Integrity，來自 `package-lock.json`）：
  ```
  sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==
  ```

`npm ci` 會依 lockfile 中的上述雜湊驗證下載內容；若來源被竄改，安裝會失敗。

## 支援範圍 · Supported versions

本專案採持續交付，安全修正一律針對 `main` 分支的最新狀態。

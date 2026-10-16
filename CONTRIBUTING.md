# 貢獻指南 · Contributing

歡迎貢獻！本專案是 [YoLab 軟體開發工作室](https://yakitori197.github.io/YoLab/) 的開源展示專案。

## 開發流程 · Development workflow

1. Fork 並 clone 專案。
2. 安裝相依：`npm ci`（Node.js／npm 版本需求見 README）。
3. 建立分支：`git checkout -b feature/your-change`。
4. 開發並確保下列檢查全部通過：

   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   npx playwright install chromium
   npm run test:e2e
   npm audit
   ```

5. 提交 Pull Request，並填寫 PR 範本。

## 專案原則 · Project principles

- **隱私優先**：任何變更都不得將使用者的檔案內容傳送到外部，也不得加入 Analytics、遙測或追蹤碼。
- **核心與 UI 分離**：分析邏輯放在 `src/core/`（純函式、可測試、不依賴 React／DOM）；UI 放在 `src/ui/`。
- **型別安全**：TypeScript strict 模式；**禁止**以 `any` 規避型別檢查，必要例外需以註解說明原因。
- **不渲染未清理輸入**：不使用 `dangerouslySetInnerHTML` 處理工作簿內容。
- **文件同步**：程式行為改變時，請同步更新 README 的規則表與相關文件。

## 新增一條健檢規則 · Adding a health check

1. 在 `src/core/rules/` 新增一個實作 `RuleDefinition` 介面的規則。
2. 於 `src/core/rules/registry.ts` 註冊。
3. 在 `src/core/__tests__/` 新增對應測試（至少涵蓋「會觸發」與「不會觸發」兩種情境）。
4. 更新 README 的規則表。

規則需輸出：規則代碼、嚴重程度、問題說明、影響範圍、建議處理方式，且判斷結果需可重現、可測試。

## 提交訊息 · Commit messages

建議採用 [Conventional Commits](https://www.conventionalcommits.org/)（如 `feat:`、`fix:`、`docs:`、`test:`、`refactor:`）。

## 示範資料 · Demo data

- 所有示範檔必須是**完全虛構的合成資料**，不得包含真實公司、人名、電話、Email、地址、統編或產品。
- 請透過 `samples/generate-samples.mjs` 產生，確保來源可稽核。

## 行為準則 · Code of conduct

請以尊重、友善、具建設性的態度參與討論與審查。

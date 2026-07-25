# 示範資料 · Demo data

此資料夾內的所有檔案皆為 **完全虛構的合成資料**，用於展示與測試。
**沒有任何真實的公司、人名、電話、Email、地址、統一編號或產品。**

All files here are **entirely fictional synthetic data** for demonstration and
testing. They contain **no real** company, person, phone, email, address, tax id
or product.

## 檔案 · Files

| 檔案 | 內容 | 預期健檢結果 |
| --- | --- | --- |
| `good-inventory.xlsx` | 品質良好的庫存表（唯一品號、型別一致、日期一致、無空白） | 健康評分接近滿分 |
| `good-inventory.csv` | 上表的 CSV 版本（UTF-8 with BOM，日期為 ISO 字串） | 健康評分接近滿分 |
| `messy-inventory.xlsx` | 含空白、重複列、重複品號、混合型別、數值存為文字、日期格式不一致、前後空白、空白欄名與空白欄 | 觸發 R001–R008、R014 等多項問題 |
| `production-schedule.xlsx` | 多工作表生產排程：含公式、合併儲存格、公式錯誤（`#DIV/0!`）與一個隱藏的「參數」工作表 | 觸發 R009、R011、R012 |

## 如何重新產生 · How to regenerate

這些二進位 `.xlsx` 檔由 [`generate-samples.mjs`](generate-samples.mjs) 以 SheetJS 產生。
執行下列指令即可重建，確保檔案來源永遠可從原始碼稽核：

```bash
npm run generate:samples
```

腳本是決定性的（不使用亂數或當下時間），每次產生的內容一致。

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

async function upload(page: Page, name: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '選擇檔案 Choose file' }).click();
  await (await chooser).setFiles(resolve('samples', name));
  await expect(page.getByRole('button', { name: '選擇檔案 Choose file' })).toBeEnabled();
  await expect(page.getByRole('heading', { name: '分析結果 Results' })).toBeVisible();
  await expect(page.locator('.meta-grid')).toContainText(name);
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('XLSX upload, filtering, JSON download and clear leave the source unchanged', async ({ page }) => {
  const source = resolve('samples/messy-inventory.xlsx');
  const original = await readFile(source);
  const requests: string[] = [];
  page.on('request', request => {
    if (request.method() !== 'GET' || new URL(request.url()).origin !== 'http://127.0.0.1:4173') {
      requests.push(`${request.method()} ${request.url()}`);
    }
  });
  await upload(page, 'messy-inventory.xlsx');
  await expect(page.getByRole('img', { name: /健康評分/ })).toBeVisible();
  await page.getByLabel('規則 Rule').selectOption('R003');
  await expect(page.locator('article.finding')).toHaveCount(1);
  await expect(page.locator('article.finding')).toContainText('R003');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載 JSON' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('messy-inventory-audit.json');
  const report = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(report.file).toMatchObject({ name: 'messy-inventory.xlsx', type: 'xlsx', sheetCount: 1 });
  // Export is the complete report, even when the UI is filtered.
  expect(report.findings.length).toBeGreaterThan(1);
  expect(report.findings.some((finding: { ruleId: string }) => finding.ruleId === 'R003')).toBe(true);
  await page.getByRole('button', { name: '清除結果' }).click();
  await expect(page.getByRole('heading', { name: '分析結果 Results' })).toHaveCount(0);
  await upload(page, 'messy-inventory.xlsx');
  await expect(page.getByLabel('規則 Rule')).toHaveValue('__all__');
  expect(await readFile(source)).toEqual(original);
  expect(requests).toEqual([]);
});

test('CSV stays local, exports no cell values and disappears on reload', async ({ page }) => {
  const marker = 'PRIVATE_SYNTHETIC_CELL_92f1';
  await page.getByLabel('選擇 Excel 或 CSV 檔案').setInputFiles({
    name: 'privacy.csv', mimeType: 'text/csv',
    buffer: Buffer.from(`ID,Note\n1,${marker}\n1,${marker}\n`),
  });
  await expect(page.locator('.meta-grid')).toContainText('privacy.csv');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載 JSON' }).click();
  const text = await readFile((await (await downloading).path())!, 'utf8');
  expect(JSON.parse(text).file.type).toBe('csv');
  expect(text).not.toContain(marker);
  expect(text).not.toContain('fakepath');
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await page.reload();
  await expect(page.getByRole('button', { name: '選擇檔案 Choose file' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '分析結果 Results' })).toHaveCount(0);
});

test('a new workbook resets filters, including a repeated upload of the same file', async ({ page }) => {
  await upload(page, 'messy-inventory.xlsx');
  await page.getByLabel('規則 Rule').selectOption('R003');
  await page.getByLabel('工作表 Sheet', { exact: true }).selectOption('庫存 Inventory');
  await page.getByLabel('嚴重程度 Severity').selectOption('high');
  await upload(page, 'production-schedule.xlsx');
  for (const name of ['規則 Rule', '工作表 Sheet', '嚴重程度 Severity']) {
    await expect(page.getByLabel(name, { exact: true })).toHaveValue('__all__');
  }
  await expect(page.locator('article.finding').filter({ hasText: 'R012' })).toHaveCount(1);
  await page.getByLabel('規則 Rule').selectOption('R012');
  await upload(page, 'production-schedule.xlsx');
  await expect(page.getByLabel('規則 Rule')).toHaveValue('__all__');
});

test('invalid and empty files show an error and a valid CSV recovers', async ({ page }) => {
  for (const file of [
    { name: 'empty.csv', mimeType: 'text/csv', buffer: Buffer.alloc(0) },
    { name: 'invalid.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('not an xlsx') },
    { name: 'unsupported.xls', mimeType: 'application/octet-stream', buffer: Buffer.from('invalid') },
  ]) {
    await page.getByLabel('選擇 Excel 或 CSV 檔案').setInputFiles(file);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('heading', { name: '分析結果 Results' })).toHaveCount(0);
    await upload(page, 'good-inventory.csv');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('img', { name: /健康評分 100 分/ })).toBeVisible();
  }
});

test('drag and drop parses a workbook and print mode hides controls', async ({ page }) => {
  const bytes = [...await readFile(resolve('samples/production-schedule.xlsx'))];
  const transfer = await page.evaluateHandle(data => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(data)], 'production-schedule.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }));
    return transfer;
  }, bytes);
  await page.locator('.dropzone').dispatchEvent('drop', { dataTransfer: transfer });
  await expect(page.getByRole('heading', { name: '分析結果 Results' })).toBeVisible();
  await expect(page.getByRole('row', { name: /參數 Params/ })).toContainText('隱藏 Hidden');
  await page.evaluate(() => {
    window.print = () => { document.documentElement.dataset.printRequested = 'true'; };
  });
  await page.getByRole('button', { name: '列印／PDF' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-print-requested', 'true');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.dropzone')).toBeHidden();
  await expect(page.getByRole('button', { name: '下載 JSON' })).toBeHidden();
  await expect(page.getByRole('heading', { name: '健康評分 Health score' })).toBeVisible();
});

test('navigation and report fit the viewport in light and dark mode', async ({ page }) => {
  await page.getByRole('link', { name: '開始分析', exact: true }).click();
  await expect(page).toHaveURL(/#tool$/);
  await upload(page, 'production-schedule.xlsx');
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('heading', { name: '分析結果 Results' })).toBeVisible();
  }
});

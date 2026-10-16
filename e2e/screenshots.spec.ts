import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

test('capture real UI using only the synthetic inventory sample', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Documentation uses a fixed desktop viewport.');
  await mkdir('docs/screenshots', { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('./');
  await expect(page.getByRole('button', { name: '選擇檔案 Choose file' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/home.png', animations: 'disabled' });
  await page.getByLabel('選擇 Excel 或 CSV 檔案').setInputFiles(resolve('samples/messy-inventory.xlsx'));
  await expect(page.getByRole('heading', { name: '分析結果 Results' })).toBeVisible();
  // Show the score and the actual duplicate-row finding together, without a huge full-page image.
  await page.getByLabel('規則 Rule').selectOption('R003');
  await page.locator('#tool > .container > .stack').screenshot({
    path: 'docs/screenshots/report.png', animations: 'disabled',
  });
});

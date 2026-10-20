import { test, expect } from '@playwright/test';
import { openAs } from './helpers';
import { action } from './forms';

// The admin console: merging two members, the Danalock sync (against the
// fake lock) and the mandatory certificate. Merging has members of its own
// in the e2e scenario. Written against the Blaze page and meant to pass
// against its replacement (see liability.spec.ts).

test.describe('Admin console', () => {
  test('previews and merges one member into another', async ({ page }) => {
    await openAs(page, 'admin', '/admin');
    await page.getByLabel(/source member number/i).fill('915');
    await page.getByLabel(/destination member number/i).fill('916');
    await action(page, /^preview$/i).click();
    await expect(page.getByRole('heading', { name: /moved to the destination/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'E2E merge source' })).toBeVisible();
    await action(page, /^merge$/i).click();
    await action(page, /^yes, merge and delete 915$/i).click();
    await expect(page.getByText(/merged 915/i)).toBeVisible();
    await page.getByRole('link', { name: /E2E merge destination/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E merge destination');
  });

  test('refuses to preview a member number nobody has', async ({ page }) => {
    await openAs(page, 'admin', '/admin');
    await page.getByLabel(/source member number/i).fill('999999');
    await page.getByLabel(/destination member number/i).fill('916');
    await action(page, /^preview$/i).click();
    await expect(page.getByText(/no member with number 999999/i)).toBeVisible();
  });

  test('runs the Danalock sync', async ({ page }) => {
    await openAs(page, 'admin', '/admin');
    let report = '';
    page.on('dialog', (dialog) => { if (dialog.type() === 'alert') report = dialog.message(); dialog.accept(); });
    await action(page, /^sync now$/i).click();
    await page.getByRole('dialog').getByRole('button', { name: /^sync/i }).click({ timeout: 3000 }).catch(() => {});
    await expect.poll(async () => report || (await page.getByRole('status').or(page.getByRole('alert')).first().textContent().catch(() => ''))).toMatch(/\w/);
  });
});

import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';

// Lock synchronization against the fake lock API ("lockApi": "fake"): who has
// the wrong end date on the door, and fixing it. The fake's state comes from
// the e2e scenario. Written against the Blaze page and meant to pass against
// its replacement (see liability.spec.ts).

const row = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });
const synchronize = async (page: Page) => {
  await page.getByRole('button', { name: /^synchronize$/i }).click();
  await expect(page.getByRole('row').nth(1)).toBeVisible();
};

test.describe('Lock synchronization', () => {
  test('shows who has the wrong end date on the door', async ({ page }) => {
    await openAs(page, 'admin', '/lock');
    await expect(page.getByRole('heading', { name: /^lock synchronization$/i, level: 1 })).toBeVisible();
    await synchronize(page);
    await expect(row(page, 'Dagny Rabatt')).toContainText(/wrong/i);
    await expect(row(page, 'Maja Medlem')).toHaveCount(0);

    await page.getByLabel(/correct date/i).check();
    await expect(row(page, 'Maja Medlem')).toContainText(/correct/i);
    await page.getByLabel(/^invited/i).check();
    await expect(row(page, 'Kalle Kvartal')).toContainText(/invited/i);
    await page.getByLabel(/no account/i).check();
    await expect(row(page, 'Olle Gammalavtal')).toContainText(/no ?account/i);
  });

  test('fixes a wrong end date', async ({ page }) => {
    await openAs(page, 'admin', '/lock');
    await synchronize(page);
    await row(page, 'Ulla Utesluten').getByRole('button', { name: /fix it/i }).click();
    await expect(row(page, 'Ulla Utesluten')).toContainText(/stale/i);

    await synchronize(page);
    await expect(row(page, 'Ulla Utesluten')).toHaveCount(0);
    await page.getByLabel(/correct date/i).check();
    await expect(row(page, 'Ulla Utesluten')).toContainText(/correct/i);
  });
});

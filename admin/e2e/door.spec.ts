import { test, expect } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, expectSearch } from './lists';

// Door openings: the list of unlocks and the visit statistics, the latter
// from the fake lock's log. Written against the Blaze pages and meant to
// pass against their replacement (see liability.spec.ts).

const rows = dataRows;

test.describe('Door unlocks', () => {
  test('lists the openings, with names on request', async ({ page }) => {
    await openAs(page, 'admin', '/doorunlocks');
    await expect(page.getByRole('heading', { name: /^door unlocks$/i, level: 1 })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'user-guest-gast@example.org' })).toBeVisible();
    await expect(page.getByText('Maja Medlem')).not.toBeVisible();
    await page.getByLabel(/show names/i).check();
    await expect(rows(page).filter({ hasText: 'Maja Medlem' }).first()).toBeVisible();
  });

  test('searches the list', async ({ page }) => {
    await openAs(page, 'admin', '/doorunlocks');
    await expect(rows(page).first()).toBeVisible();
    await expectSearch(page, 'gast', 'user-guest-gast@example.org', 'app');
  });

  test('the treasurer does not see them', async ({ page }) => {
    await openAs(page, 'treasurer', '/doorunlocks');
    await expect(page.getByText('user-guest-gast@example.org')).not.toBeVisible();
  });
});

test.describe('Door statistics', () => {
  test('charts the visits from the lock', async ({ page }) => {
    await openAs(page, 'admin', '/door');
    await expect(page.getByRole('heading', { name: /^door statistics$/i, level: 1 })).toBeVisible();
    await page.getByRole('button', { name: /check door visits/i }).click();
    await expect(page.locator('canvas').first()).toBeVisible();
  });
});

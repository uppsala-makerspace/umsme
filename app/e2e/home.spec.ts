import { test, expect } from '@playwright/test';
import { openAs } from './helpers';
import en from '../imports/i18n/en.json';

// The home page's cards: the counts on them. Read-only.
test.describe('Home', () => {
  test('the Expenses card says, in red, how many expenses wait for my approval, and opens them', async ({ page }) => {
    // The group leader approves on the ceramics account, where two expenses are submitted (scenarios/e2e.js).
    await openAs(page, 'groupLeader', '/');
    // The badge comes first in the card.
    const card = page.getByRole('link', { name: `2 ${en.expenses}`, exact: true });
    await expect(card).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(/\/expenses\?tab=approve$/);
    await expect(page.getByRole('heading', { name: en.expensesToApprove })).toBeVisible();
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(2);
  });

  test('one with nothing to approve sees no count on the Expenses card', async ({ page }) => {
    await openAs(page, 'member', '/');
    await expect(page.getByRole('main').getByText(en.expenses, { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: new RegExp(`^\\d+ ${en.expenses}$`) })).toHaveCount(0);
  });
});

import { test, expect } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, expectSearch, sortBy } from './lists';

// The small member lists: excluded members, and the members whose membership
// or lab ends within the reminder window. Written against the Blaze pages
// and meant to pass against their replacement (see liability.spec.ts).

const rows = dataRows;

test.describe('Excluded members', () => {
  test('lists the excluded members only', async ({ page }) => {
    await openAs(page, 'admin', '/excluded');
    await expect(page.getByRole('heading', { name: /^excluded members$/i, level: 1 })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'Ulla Utesluten' })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'Maja Medlem' })).toHaveCount(0);
  });

  test('opens a member from the list', async ({ page }) => {
    await openAs(page, 'admin', '/excluded');
    await rows(page).filter({ hasText: 'Ulla Utesluten' }).getByText(/excluded@/).click();
    await expect(page).toHaveURL(/\/member\//);
  });

  test('the treasurer does not see them', async ({ page }) => {
    await openAs(page, 'treasurer', '/excluded');
    await expect(page.getByText('Ulla Utesluten')).not.toBeVisible();
  });
});

test.describe('Reminders', () => {
  test('lists the members whose membership ends soon', async ({ page }) => {
    await openAs(page, 'admin', '/reminders');
    await expect(page.getByRole('heading', { name: /^reminders$/i, level: 1 })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'Ella Utgående' })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'Maja Medlem' })).toHaveCount(0);
    await expect(rows(page).filter({ hasText: 'Erik Utgången' })).toHaveCount(0);
  });

  test('searches and sorts the list', async ({ page }) => {
    await openAs(page, 'admin', '/reminders');
    await expect(rows(page).filter({ hasText: 'Ella Utgående' })).toBeVisible();
    await sortBy(page, 'Name', 'ascending');
    await expect(rows(page).first()).toBeVisible();
    await expectSearch(page, 'ella', 'Ella Utgående', 'Nothing-matches-this');
  });

  test('offers to run the reminder job', async ({ page }) => {
    await openAs(page, 'admin', '/reminders');
    await expect(page.getByRole('button', { name: /run reminder job now/i })).toBeVisible();
  });
});

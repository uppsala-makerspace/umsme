import { test, expect } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, expectSearch } from './lists';

// Door openings: the list of unlocks, and the visits (days a member opened
// any door) per day, month, quarter and year. The list was written against
// the Blaze pages and meant to pass against their replacement (see
// liability.spec.ts).

const rows = dataRows;

test.describe('Door unlocks', () => {
  test('lists the openings, with names on request', async ({ page }) => {
    await openAs(page, 'admin', '/activity?tab=unlocks');
    await expect(page.getByRole('heading', { name: /^activity$/i, level: 1 })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Door unlocks', selected: true })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'user-guest-gast@example.org' })).toBeVisible();
    await expect(page.getByText('Maja Medlem')).not.toBeVisible();
    await page.getByLabel(/show names/i).check();
    await expect(rows(page).filter({ hasText: 'Maja Medlem' }).first()).toBeVisible();
  });

  test('searches the list', async ({ page }) => {
    await openAs(page, 'admin', '/activity?tab=unlocks');
    await expect(rows(page).first()).toBeVisible();
    await expectSearch(page, 'gast', 'user-guest-gast@example.org', 'app');
  });

  test('the treasurer does not see them', async ({ page }) => {
    await openAs(page, 'treasurer', '/activity?tab=unlocks');
    await expect(page.getByText('user-guest-gast@example.org')).not.toBeVisible();
  });
});

test.describe('The old addresses', () => {
  test('lead to their tab of the Activity page', async ({ page }) => {
    await openAs(page, 'admin', '/doorunlocks');
    await expect(page).toHaveURL(/\/activity\?tab=unlocks$/);
    await expect(page.getByRole('tab', { name: 'Door unlocks', selected: true })).toBeVisible();
    await page.goto('/door');
    await expect(page).toHaveURL(/\/activity$/);
    await expect(page.getByRole('tab', { name: 'Door statistics', selected: true })).toBeVisible();
  });

  test('switches between the tabs', async ({ page }) => {
    await openAs(page, 'admin', '/activity');
    await page.getByRole('tab', { name: 'Door unlocks' }).click();
    await expect(page).toHaveURL(/\/activity\?tab=unlocks$/);
    await expect(page.getByLabel(/show names/i)).toBeVisible();
  });
});

test.describe('Door visits', () => {
  // The month and year of Maja's opening yesterday: always some visits there.
  const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
  const month = yesterday.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'Europe/Stockholm' });
  const year = yesterday.toLocaleString('en-GB', { year: 'numeric', timeZone: 'Europe/Stockholm' });

  test('charts the visits per day of a month', async ({ page }) => {
    await openAs(page, 'admin', '/');
    await page.getByRole('link', { name: 'Activity' }).click();
    await expect(page.getByRole('heading', { name: /^activity$/i, level: 1 })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Door statistics', selected: true })).toBeVisible();
    await page.getByLabel('Month').click();
    await page.getByRole('option', { name: month }).click();
    await expect(page.getByText(new RegExp(`^${month}: \\d+ visits? by \\d+ members?, on average [\\d,]+ visits per day$`))).toBeVisible();
    await expect(page.getByRole('img', { name: 'Visits per day' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Average visits per weekday' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Door openings per hour of the day' })).toBeVisible();
  });

  test('counts visits or unique members per month', async ({ page }) => {
    await openAs(page, 'admin', '/activity');
    await page.getByRole('button', { name: 'Per month', exact: true }).click();
    await page.getByLabel('Year').click();
    await page.getByRole('option', { name: year, exact: true }).click();
    await expect(page.getByRole('img', { name: 'Visits per month' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Average visits per weekday' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Door openings per hour of the day' })).toBeVisible();
    await page.getByRole('button', { name: 'Unique members', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Unique members per month' })).toBeVisible();
    await expect(page.getByText(/on average [\d,]+ unique member visits per month$/)).toBeVisible();
  });

  test('charts per quarter and per year', async ({ page }) => {
    await openAs(page, 'admin', '/activity');
    await page.getByRole('button', { name: 'Per quarter', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Visits per quarter' })).toBeVisible();
    await page.getByRole('button', { name: 'Per year', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Visits per year' })).toBeVisible();
    // No average, weekdays or hours per quarter or year.
    await expect(page.getByText(/on average/)).toHaveCount(0);
    await expect(page.getByRole('img', { name: 'Average visits per weekday' })).toHaveCount(0);
    await expect(page.getByRole('img', { name: 'Door openings per hour of the day' })).toHaveCount(0);
  });

  test('the treasurer does not see them', async ({ page }) => {
    await openAs(page, 'treasurer', '/activity');
    // Both tabs are mounted, each with its own refusal: the statistics' one.
    await expect(page.getByRole('tabpanel', { name: 'Door statistics' }).getByText(/do not have access/i)).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
  });
});

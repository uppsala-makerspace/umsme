import { test, expect } from '@playwright/test';
import { openAs } from './helpers';

// The statistics pages: member history, membership statistics and revenue.
// They read; the figures come from the e2e personas' payments. Written
// against the Blaze pages and meant to pass against their replacement (see
// liability.spec.ts).

test.describe('Member history', () => {
  test('lists the current members, and those who left', async ({ page }) => {
    await openAs(page, 'admin', '/history');
    await expect(page.getByRole('heading', { name: /^member history$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/current members:/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Maja Medlem' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Erik Utgången' })).not.toBeVisible();

    await page.getByLabel(/members that left/i).check();
    await expect(page.getByRole('link', { name: 'Erik Utgången' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Maja Medlem' })).not.toBeVisible();
  });
});

test.describe('Membership statistics', () => {
  test('shows the member count and the charts', async ({ page }) => {
    await openAs(page, 'admin', '/stats');
    await expect(page.getByRole('heading', { name: /^memberships$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/all members:\s*\d+/i)).toBeVisible();
    await expect(page.locator('canvas').first()).toBeVisible();
    await expect(page.getByRole('img', { name: 'Churn over the last year' })).toBeVisible();
    await page.getByRole('radio', { name: /last year/i }).check();
    await expect(page.getByText(/all members:\s*\d+/i)).toBeVisible();
  });
});

test.describe('Revenue', () => {
  test('shows the key figures and the years', async ({ page }) => {
    await openAs(page, 'admin', '/revenue');
    await expect(page.getByRole('heading', { name: /^revenue$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(/last twelve months/i).first()).toBeVisible();
    await expect(page.getByText(/\d kr/).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /^per year$/i })).toBeVisible();
    await expect(page.getByRole('cell', { name: new RegExp(`^${new Date().getFullYear()}`) }).first()).toBeVisible();
    await expect(page.locator('canvas').first()).toBeVisible();
  });
});

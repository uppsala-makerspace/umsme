import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';

// Storage administration: the dashboard, the queue, the walls, the inventory
// and a unit's detail, on the storage fixtures of the e2e scenario (units
// 1001-1006, see common/server/seed/scenarios/e2e.js). Each test that changes
// something has a unit or wall of its own. Written against the Blaze page and
// meant to pass against its replacement (see liability.spec.ts).

const unit = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(`^${name}\\b`) });
const openStorage = async (page: Page) => {
  await openAs(page, 'storage', '/storage');
  await expect(page.getByRole('heading', { name: /^storage$/i, level: 1 })).toBeVisible();
  await expect(unit(page, '1001')).toBeVisible();
};

test.describe('Storage', () => {
  test('shows the suggested actions, the queue, the walls and the units', async ({ page }) => {
    await openStorage(page);
    await expect(page.getByRole('heading', { name: /suggested actions/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /make assignments/i })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Kim Kö' })).toBeVisible();
    await expect(page.getByText(/Floor 1, Wall 1/).first()).toBeVisible();
    await expect(unit(page, '1006')).toBeVisible();
  });

  test('is for storage operators only', async ({ page }) => {
    await openAs(page, 'treasurer', '/storage');
    await expect(page.getByText(/not authorized/i)).toBeVisible();
  });

  test('shows a unit and who has it', async ({ page }) => {
    await openStorage(page);
    await unit(page, '1002').click();
    await expect(page.getByRole('heading', { name: /unit 1002/i })).toBeVisible();
    await expect(page.getByText(/Vera Varnad/).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /open member/i })).toBeVisible();
  });

  test('filters the inventory by status', async ({ page }) => {
    await openStorage(page);
    await page.getByLabel(/^status/i).first().selectOption('awaiting_clearance');
    await expect(unit(page, '1003')).toBeVisible();
    await expect(unit(page, '1001')).not.toBeVisible();
  });

  test('confirms that a unit has been cleared', async ({ page }) => {
    await openStorage(page);
    await expect(unit(page, '1003')).toHaveAccessibleName(/awaiting clearance/i);
    await unit(page, '1003').click();
    await page.getByRole('button', { name: /confirm physical clearance/i }).click();
    await expect(unit(page, '1003')).toHaveAccessibleName(/available/i);
  });

  test('adds a wall', async ({ page }) => {
    await openStorage(page);
    await page.getByRole('button', { name: /^add wall$/i }).click();
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: /^create wall$/i }) });
    await form.getByLabel(/^name/i).fill('E2E wall');
    await form.getByLabel(/display order/i).fill('9');
    await form.getByLabel(/^columns/i).fill('2');
    await form.getByLabel(/^rows/i).fill('3');
    await form.getByRole('button', { name: /^create wall$/i }).click();
    await expect(page.getByText(/E2E wall · 2 × 3/)).toBeVisible();
  });

  test('previews the suggested assignments', async ({ page }) => {
    await openStorage(page);
    await page.getByRole('button', { name: /make assignments/i }).click();
    await expect(page.getByRole('heading', { name: /^make assignments$/i })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Kim Kö' }).filter({ hasText: /oldest/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /confirm selected/i })).toBeVisible();
  });

  test('shows the event log', async ({ page }) => {
    await openStorage(page);
    await expect(page.getByRole('heading', { name: /^event log$/i })).toBeVisible();
  });
});

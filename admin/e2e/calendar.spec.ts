import { test, expect } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows } from './lists';
import { action, openTab } from './forms';

// Importing the calendar (the fake one of settings_demo.json), making an
// activity of an event, and taking in events by an activity's name.

test.describe('Calendar and activities', () => {
  test('imports the calendar’s events, each once', async ({ page }) => {
    await openAs(page, 'admin', '/events');
    await action(page, /^import from calendar$/i).click();
    await expect(page.getByRole('heading', { name: 'Import from the calendar', level: 1 })).toBeVisible();
    await action(page, /^fetch$/i).click();
    await expect(dataRows(page).filter({ hasText: 'Makermässa' })).toContainText('A free-standing event');
    await action(page, /^import \d+ chosen$/i).click();
    await expect(page.getByText(/^\d+ imported\.$/)).toBeVisible();
    await expect(dataRows(page).filter({ hasText: 'Makermässa' })).toContainText('Imported');
    await expect(page.getByRole('button', { name: /^import/i })).toBeDisabled();
  });

  test('makes an activity of a free-standing event', async ({ page }) => {
    await openAs(page, 'admin', '/events');
    await page.getByText('E2E gör aktivitet', { exact: true }).click();
    await action(page, /^make an activity of it$/i).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Activity: E2E gör aktivitet');
    await expect(page.getByRole('tab', { name: /^events \(1\)$/i, selected: true })).toBeVisible();
  });

  test('takes in the free-standing events with an activity’s name', async ({ page }) => {
    await openAs(page, 'admin', '/activities');
    await page.getByText('E2E match aktivitet', { exact: true }).click();
    await openTab(page, /^events \(0\)$/i);
    await action(page, /^find events by name$/i).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('checkbox')).toHaveCount(2);
    await dialog.getByRole('button', { name: /^make 2 its events$/i }).click();
    await expect(page.getByText('2 events are now the activity’s.')).toBeVisible();
    await expect(page.getByRole('tab', { name: /^events \(2\)$/i })).toBeVisible();
  });
});

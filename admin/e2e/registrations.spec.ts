import { test, expect } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows } from './lists';
import { field, action, openTab } from './forms';

// An event's participants in admin, and an activity's registration settings.

test.describe('Registrations in admin', () => {
  test('lists an event’s participants and adds one', async ({ page }) => {
    await openAs(page, 'admin', '/events');
    await page.getByText('E2E deltagare', { exact: true }).click();
    await openTab(page, /^participants \(1\)$/i);
    await expect(page).toHaveURL(/\?tab=participants$/);
    await expect(dataRows(page).filter({ hasText: 'Bo Basmedlem' })).toContainText('Has a seat');
    await page.getByRole('combobox', { name: 'Add a participant' }).fill('Dagny');
    await page.getByRole('option', { name: /Dagny Rabatt/ }).click();
    await expect(dataRows(page).filter({ hasText: 'Dagny Rabatt' })).toContainText('Has a seat');
    await expect(page.getByRole('tab', { name: /^participants \(2\)$/i })).toBeVisible();
    await dataRows(page).filter({ hasText: 'Dagny Rabatt' }).getByRole('button', { name: 'Take off' }).click();
    await expect(dataRows(page).filter({ hasText: 'Dagny Rabatt' })).toContainText('Withdrew');
  });

  test('an activity takes registrations with seats and a queue', async ({ page }) => {
    await openAs(page, 'admin', '/activities/add');
    await field(page, 'Name (Swedish)').fill('E2E anmälningskurs');
    await page.getByRole('combobox', { name: 'Registration', exact: true }).selectOption('required');
    await field(page, 'Seats').fill('4');
    await page.getByRole('checkbox', { name: 'Queue when full' }).check();
    await action(page, /^add$/i).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E anmälningskurs');
    await expect(page.getByRole('combobox', { name: 'Registration', exact: true }).locator('option:checked')).toHaveText('Registration required');
    await expect(field(page, 'Seats')).toHaveValue('4');
    await expect(page.getByRole('checkbox', { name: 'Queue when full' })).toBeChecked();
  });

  test('check-in has a default window, shown but not to edit, or a custom one', async ({ page }) => {
    await openAs(page, 'admin', '/activities/add');
    await field(page, 'Name (Swedish)').fill('E2E incheckningskurs');
    await page.getByRole('combobox', { name: 'Registration', exact: true }).selectOption('required');
    const checkIn = page.getByRole('combobox', { name: 'Check-in beforehand' });
    await checkIn.selectOption('default');
    await expect(field(page, 'Opens at')).toHaveValue('03:00');
    await expect(field(page, 'Opens at')).toBeDisabled();
    await expect(field(page, 'Closes at')).toHaveValue('15:00');
    await checkIn.selectOption('custom');
    await expect(field(page, 'Closes at')).toBeEnabled();
    await field(page, 'Closes at').fill('18:00');
    await action(page, /^add$/i).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E incheckningskurs');
    await expect(checkIn.locator('option:checked')).toHaveText('Yes (custom)');
    await expect(field(page, 'Opens at')).toHaveValue('03:00');
    await expect(field(page, 'Closes at')).toHaveValue('18:00');
  });
});


import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, expectSearch, sortBy } from './lists';
import { field, numberField, action, saveButton, confirmed, deleteConfirmed } from './forms';

// Web shop items: list, add, edit, workshops, image, delete, and who sees
// them. Written against the Blaze pages and meant to pass unchanged against
// their replacement (see liability.spec.ts for the approach).

const CLAY = 'Lera, 10 kg';
const DONATION = 'Gåva';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const itemRows = dataRows;

const openItem = async (page: Page, name: string) => {
  await openAs(page, 'admin', '/storeitems');
  await page.getByText(name, { exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
};

test.describe('Store items', () => {
  test('lists the items with code, price and account', async ({ page }) => {
    await openAs(page, 'admin', '/storeitems');
    await expect(page.getByRole('heading', { name: /store items/i })).toBeVisible();
    const clay = itemRows(page).filter({ hasText: CLAY });
    await expect(clay).toContainText('lera');
    await expect(clay).toContainText('150');
    await expect(clay).toContainText('3010');
  });

  test('the board sees them too', async ({ page }) => {
    await openAs(page, 'board', '/storeitems');
    await expect(page.getByText(CLAY, { exact: true })).toBeVisible();
  });

  test('the treasurer does not see them', async ({ page }) => {
    await openAs(page, 'treasurer', '/storeitems');
    await expect(page.getByRole('heading', { name: /store items/i })).toBeVisible();
    await expect(page.getByText(CLAY, { exact: true })).not.toBeVisible();
  });

  test('searches the list', async ({ page }) => {
    await openAs(page, 'admin', '/storeitems');
    await expect(page.getByText(CLAY, { exact: true })).toBeVisible();
    await expectSearch(page, 'gåva', DONATION, CLAY);
  });

  test('sorts the list by code', async ({ page }) => {
    await openAs(page, 'admin', '/storeitems');
    await expect(page.getByText(CLAY, { exact: true })).toBeVisible();
    await sortBy(page, 'Code', 'descending');
    await expect(itemRows(page).first()).toContainText('lera');
  });

  test('adds an item and shows its page', async ({ page }) => {
    await openAs(page, 'admin', '/storeitems');
    await action(page, /^add store item$/i).click();
    await field(page, 'Code').fill('e2e-new');
    await field(page, 'Name (Swedish)').fill('E2E new item');
    await numberField(page, /^Price/).fill('40');
    await field(page, 'Bookkeeping account').fill('3012');
    await action(page, /^(add store item|save|create)$/i).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E new item');
    await openAs(page, 'admin', '/storeitems');
    await expect(itemRows(page).filter({ hasText: 'e2e-new' })).toContainText('40');
  });

  test('refuses a code with capitals or spaces', async ({ page }) => {
    await openAs(page, 'admin', '/storeitems/add');
    await field(page, 'Code').fill('Ny Vara');
    await field(page, 'Name (Swedish)').fill('E2E bad code');
    await field(page, 'Bookkeeping account').fill('3012');
    await action(page, /^(add store item|save|create)$/i).click();

    await openAs(page, 'admin', '/storeitems');
    await expect(page.getByText(CLAY, { exact: true })).toBeVisible();
    await expect(page.getByText('E2E bad code', { exact: true })).not.toBeVisible();
  });

  test('tells that the buyer sets the price when there is none', async ({ page }) => {
    await openItem(page, DONATION);
    await expect(page.getByText(/buyer enters the amount/i)).toBeVisible();
  });

  test('edits an item and hides it', async ({ page }) => {
    await openItem(page, 'E2E edit item');
    await field(page, 'Name (Swedish)').fill('E2E edited item');
    await numberField(page, /^Price/).fill('30');
    await page.getByRole('combobox', { name: 'Status' }).selectOption({ label: 'Hidden' });
    await saveButton(page).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E edited item');
    await openItem(page, 'E2E edited item');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/hidden/i);
    await expect(numberField(page, /^Price/)).toHaveValue('30');
  });

  test('links an item to a workshop', async ({ page }) => {
    await openItem(page, CLAY);
    await page.getByRole('checkbox', { name: 'Keramikverkstaden' }).check();
    await expect(page.getByRole('checkbox', { name: 'Keramikverkstaden' })).toBeChecked();
    await openItem(page, CLAY);
    await expect(page.getByRole('checkbox', { name: 'Keramikverkstaden' })).toBeChecked();
  });

  test('uploads and removes an image', async ({ page }) => {
    await openItem(page, DONATION);
    await page.locator('input[type="file"]').setInputFiles({ name: 'gava.png', mimeType: 'image/png', buffer: PNG });
    await action(page, /^upload image$/i).click();
    await expect(page.getByRole('img', { name: DONATION })).toBeVisible();

    await confirmed(page, /^remove image$/i);
    await expect(page.getByText(/no image/i)).toBeVisible();
  });

  test('deletes an item that was never bought', async ({ page }) => {
    await openItem(page, 'E2E delete item');
    await deleteConfirmed(page);

    await expect(page.getByText(CLAY, { exact: true })).toBeVisible();
    await expect(page.getByText('E2E delete item', { exact: true })).not.toBeVisible();
  });

  test('keeps an item that was bought, and shows its sales', async ({ page }) => {
    await openItem(page, CLAY);
    await expect(page.getByText(/has been bought/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^delete/i })).not.toBeVisible();
    await expect(page.getByText(/2 purchase/i)).toContainText('300 kr');
  });
});

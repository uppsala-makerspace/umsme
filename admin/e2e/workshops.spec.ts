import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, expectSearch, sortBy } from './lists';
import { field, action, saveButton, confirmed, deleteConfirmed } from './forms';

// Workshops and areas of interest: list, add, edit, completeness, steering
// group, image, delete, and who sees them. Written against the Blaze pages
// and meant to pass against their replacement (see liability.spec.ts).

const CERAMICS = 'Keramikverkstaden';
const RETRO = 'Retrodatorer';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const rows = dataRows;

const openWorkshop = async (page: Page, name: string) => {
  await openAs(page, 'admin', '/workshops');
  await page.getByText(name, { exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
};

test.describe('Workshops and areas of interest', () => {
  test('lists them with kind and status', async ({ page }) => {
    await openAs(page, 'admin', '/workshops');
    await expect(page.getByRole('heading', { name: /workshops/i, level: 1 })).toBeVisible();
    await expect(rows(page).filter({ hasText: CERAMICS })).toContainText(/established/i);
    await expect(rows(page).filter({ hasText: RETRO })).toContainText(/area ?of ?interest/i);
  });

  test('the board sees them too', async ({ page }) => {
    await openAs(page, 'board', '/workshops');
    await expect(page.getByText(CERAMICS, { exact: true })).toBeVisible();
  });

  test('the treasurer does not see them', async ({ page }) => {
    await openAs(page, 'treasurer', '/workshops');
    await expect(page.getByRole('heading', { name: /workshops/i, level: 1 })).toBeVisible();
    await expect(page.getByText(CERAMICS, { exact: true })).not.toBeVisible();
  });

  test('searches and sorts the list', async ({ page }) => {
    await openAs(page, 'admin', '/workshops');
    await expect(page.getByText(CERAMICS, { exact: true })).toBeVisible();
    await sortBy(page, 'Status', 'descending');
    await expect(rows(page).first()).toContainText(/trial/i);
    await expectSearch(page, 'retro', RETRO, CERAMICS);
  });

  test('adds a workshop and shows its page', async ({ page }) => {
    await openAs(page, 'admin', '/workshops');
    await action(page, /^add workshop/i).click();
    await field(page, 'Name (Swedish)').fill('E2E ny verkstad');
    await action(page, /^(add|save|create)$/i).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E ny verkstad');
  });

  test('edits a workshop', async ({ page }) => {
    await openWorkshop(page, 'E2E edit verkstad');
    await field(page, 'Description (Swedish, markdown)').fill('En verkstad för test.');
    await field(page, 'Slack channel').fill('#e2e-verkstad');
    await page.getByRole('combobox', { name: 'Status' }).selectOption('trial');
    await saveButton(page).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/E2E edit verkstad|^Workshops/);

    await openWorkshop(page, 'E2E edit verkstad');
    await expect(field(page, 'Description (Swedish, markdown)')).toHaveValue('En verkstad för test.');
    await expect(field(page, 'Slack channel')).toHaveValue('#e2e-verkstad');
  });

  test('tells what the guideline still misses', async ({ page }) => {
    await openWorkshop(page, CERAMICS);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/incomplete/i);
    await expect(page.getByText(/missing/i).first()).toContainText(/image/i);
  });

  test('shows the steering group and its members', async ({ page }) => {
    await openWorkshop(page, CERAMICS);
    await expect(page.getByRole('link', { name: /Styrgrupp Keramik/ })).toBeVisible();
    await expect(page.getByText(/2 active members/i)).toBeVisible();
  });

  test('uploads and removes an image', async ({ page }) => {
    await openWorkshop(page, RETRO);
    await page.locator('input[type="file"]').setInputFiles({ name: 'retro.png', mimeType: 'image/png', buffer: PNG });
    await action(page, /^upload image$/i).click();
    await expect(page.getByRole('img', { name: RETRO })).toBeVisible();
    await confirmed(page, /^remove image$/i);
    await expect(page.getByText(/no image uploaded/i)).toBeVisible();
  });

  test('deletes a workshop', async ({ page }) => {
    await openWorkshop(page, 'E2E delete verkstad');
    await deleteConfirmed(page);
    await expect(page.getByText(CERAMICS, { exact: true })).toBeVisible();
    await expect(page.getByText('E2E delete verkstad', { exact: true })).not.toBeVisible();
  });
});

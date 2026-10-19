import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';

// The liability agreement versions: list, add, edit, delete, and who sees
// them. Written against the Blaze pages and meant to pass unchanged against
// their replacement, so they select by role, label and visible text, and
// name buttons loosely where a new page may word them differently.

const CURRENT = 'Ansvarsförbindelse 2025';
const OLDER = 'Ansvarsförbindelse 2023';

/** The data rows of the document list, header row excluded. */
const documentRows = (page: Page) => page.getByRole('row').filter({ has: page.getByRole('cell') });

/**
 * A form field by its accessible name, as a screen reader announces it. Not
 * getByLabel: that reads the label's text, which with MUI includes the
 * required-field asterisk.
 */
const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });

/** A button, or a link styled as one, by its name. */
const action = (page: Page, name: RegExp) =>
  page.getByRole('button', { name }).or(page.getByRole('link', { name })).or(page.getByText(name)).first();

const openDocument = async (page: Page, title: string) => {
  await openAs(page, 'admin', '/liability');
  await page.getByText(title, { exact: true }).click();
  await expect(field(page, 'Title')).toHaveValue(title);
};

test.describe('Liability documents', () => {
  test('lists the versions, newest first', async ({ page }) => {
    await openAs(page, 'admin', '/liability');
    await expect(page.getByRole('heading', { name: /liability documents/i })).toBeVisible();
    await expect(documentRows(page).first()).toContainText(CURRENT);
    await expect(documentRows(page).nth(1)).toContainText(OLDER);
  });

  test('the board sees them too', async ({ page }) => {
    await openAs(page, 'board', '/liability');
    await expect(page.getByText(CURRENT, { exact: true })).toBeVisible();
  });

  test('the treasurer does not see them', async ({ page }) => {
    await openAs(page, 'treasurer', '/liability');
    await expect(page.getByRole('heading', { name: /liability documents/i })).toBeVisible();
    await expect(page.getByText(CURRENT, { exact: true })).not.toBeVisible();
  });

  test('adds a version in both languages', async ({ page }) => {
    await openAs(page, 'admin', '/liability');
    await action(page, /add liability document/i).click();
    await field(page, 'Title').fill('E2E added version');
    await field(page, 'Date').fill('2021-03-15');
    await field(page, 'Document text (Swedish)').fill('# Ny version\n\nVar rädd om dig.');
    await field(page, 'Document text (English)').fill('# New version\n\nTake care.');
    await action(page, /^(submit|save|create|add)$/i).click();

    await expect(page.getByText('E2E added version', { exact: true })).toBeVisible();
    await page.getByText('E2E added version', { exact: true }).click();
    await expect(field(page, 'Date')).toHaveValue('2021-03-15');
    await expect(field(page, 'Document text (Swedish)')).toHaveValue('# Ny version\n\nVar rädd om dig.');
    await expect(field(page, 'Document text (English)')).toHaveValue('# New version\n\nTake care.');
  });

  test('refuses a version without a title', async ({ page }) => {
    await openAs(page, 'admin', '/liability/add');
    await field(page, 'Date').fill('2021-04-01');
    await field(page, 'Document text (Swedish)').fill('Utan titel');
    await action(page, /^(submit|save|create|add)$/i).click();

    // However the page says so (today the browser's own required-field
    // bubble), nothing is saved: no version with this date shows up.
    await expect(field(page, 'Title')).toBeVisible();
    await openAs(page, 'admin', '/liability');
    await expect(page.getByText(CURRENT, { exact: true })).toBeVisible();
    await expect(documentRows(page).filter({ hasText: '2021-04-01' })).toHaveCount(0);
  });

  test('edits a version', async ({ page }) => {
    await openDocument(page, 'E2E edit target');
    await field(page, 'Title').fill('E2E edited');
    await field(page, 'Document text (English)').fill('Edited text.');
    await action(page, /update|save/i).click();

    await expect(page.getByText('E2E edited', { exact: true })).toBeVisible();
    await expect(page.getByText('E2E edit target', { exact: true })).not.toBeVisible();
    await page.getByText('E2E edited', { exact: true }).click();
    await expect(field(page, 'Document text (English)')).toHaveValue('Edited text.');
  });

  test('deletes a version after confirmation', async ({ page }) => {
    await openDocument(page, 'E2E delete target');
    await action(page, /^delete$/i).click();
    await page.getByRole('dialog').getByRole('button', { name: /^delete$/i }).click();

    await expect(page.getByText(CURRENT, { exact: true })).toBeVisible();
    await expect(page.getByText('E2E delete target', { exact: true })).not.toBeVisible();
  });

  test('shows a version\'s date as the list does', async ({ page }) => {
    await openAs(page, 'admin', '/liability');
    await expect(documentRows(page).filter({ hasText: OLDER })).toContainText(/\d{4}-\d{2}-\d{2}/);
    const listed = (await documentRows(page).filter({ hasText: OLDER }).textContent())!.match(/\d{4}-\d{2}-\d{2}/)![0];
    await page.getByText(OLDER, { exact: true }).click();
    await expect(field(page, 'Date')).toHaveValue(listed);
  });
});

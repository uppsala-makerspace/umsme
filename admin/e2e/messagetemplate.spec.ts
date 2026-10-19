import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, expectSearch, sortBy } from './lists';
import { field, action, createButton, saveButton, deleteConfirmed } from './forms';

// Message templates: list, add, test with sample data, edit, delete, and who
// sees them. Written against the Blaze pages and meant to pass unchanged
// against their replacement (see liability.spec.ts for the approach).

const WELCOME = 'Välkommen';
const STORAGE_WARNING = 'Storage: warning';

const templateRows = dataRows;

const openTemplate = async (page: Page, name: string) => {
  await openAs(page, 'admin', '/templates');
  await page.getByText(name, { exact: true }).click();
  await expect(field(page, 'Template name')).toHaveValue(name);
};

const testButton = (page: Page) => action(page, /^test templates?$/i);

test.describe('Message templates', () => {
  test('lists the templates, the storage ones included', async ({ page }) => {
    await openAs(page, 'admin', '/templates');
    await expect(page.getByRole('heading', { name: /templates?( list)?$/i }).first()).toBeVisible();
    await expect(templateRows(page).filter({ hasText: WELCOME })).toContainText('welcome');
    await expect(page.getByText(STORAGE_WARNING, { exact: true })).toBeVisible();
  });

  test('the board sees them too', async ({ page }) => {
    await openAs(page, 'board', '/templates');
    await expect(page.getByText(WELCOME, { exact: true })).toBeVisible();
  });

  test('the treasurer does not see them', async ({ page }) => {
    await openAs(page, 'treasurer', '/templates');
    await expect(page.getByRole('heading', { name: /templates?( list)?$/i }).first()).toBeVisible();
    await expect(page.getByText(WELCOME, { exact: true })).not.toBeVisible();
  });

  test('searches the list', async ({ page }) => {
    await openAs(page, 'admin', '/templates');
    await expect(page.getByText(WELCOME, { exact: true })).toBeVisible();
    await expectSearch(page, 'warning', STORAGE_WARNING, WELCOME);
  });

  test('sorts the list by name', async ({ page }) => {
    await openAs(page, 'admin', '/templates');
    await expect(page.getByText(WELCOME, { exact: true })).toBeVisible();
    await sortBy(page, 'Template name');
    await sortBy(page, 'Template name');
    // Descending: "Välkommen" before "Storage: …" and "E2E …".
    await expect(templateRows(page).first()).toContainText(WELCOME);
  });

  test('adds a template', async ({ page }) => {
    await openAs(page, 'admin', '/templates');
    await action(page, /^add template$/i).click();
    await field(page, 'Template name').fill('E2E added template');
    await page.getByRole('combobox', { name: 'Message type' }).selectOption({ label: 'Status' });
    await page.getByRole('radio', { name: 'Lab', exact: true }).check();
    await page.getByRole('radio', { name: 'Family', exact: true }).check();
    await field(page, 'Subject').fill('Status för <%= name %>');
    await field(page, 'Text').fill('Hej <%= name %>!\n\nDitt labbmedlemskap gäller till <%= labEndDate %>.');
    await createButton(page).click();

    const row = templateRows(page).filter({ hasText: 'E2E added template' });
    await expect(row).toContainText('status');
    await expect(row).toContainText('lab');
    await expect(row).toContainText('family');
  });

  test('renders a template with sample data', async ({ page }) => {
    await openAs(page, 'admin', '/templates/add');
    await field(page, 'Subject').fill('Hej <%= name %>');
    await field(page, 'Text').fill('Ditt medlemskap gäller till <%= memberEndDate %>.');
    await testButton(page).click();
    await expect(page.getByText(/Hej Sample Member/)).toBeVisible();
    await expect(page.getByText(/gäller till 2026-05-11/)).toBeVisible();
  });

  test('refuses a template that does not compile', async ({ page }) => {
    await openAs(page, 'admin', '/templates/add');
    await field(page, 'Template name').fill('E2E broken template');
    await page.getByRole('combobox', { name: 'Message type' }).selectOption({ label: 'Status' });
    await field(page, 'Subject').fill('Trasig');
    await field(page, 'Text').fill('Hej <%= name + %>');
    await createButton(page).click();

    await expect(page.getByText(/error/i).first()).toBeVisible();
    await openAs(page, 'admin', '/templates');
    await expect(page.getByText(WELCOME, { exact: true })).toBeVisible();
    await expect(page.getByText('E2E broken template', { exact: true })).not.toBeVisible();
  });

  test('edits a template and marks it deprecated', async ({ page }) => {
    await openTemplate(page, 'E2E edit template');
    await field(page, 'Subject').fill('Edited subject');
    await page.getByRole('checkbox', { name: 'Deprecated' }).check();
    await saveButton(page).click();

    await expect(page.getByText('E2E edit template', { exact: true })).toBeVisible();
    await openTemplate(page, 'E2E edit template');
    await expect(field(page, 'Subject')).toHaveValue('Edited subject');
    await expect(page.getByRole('checkbox', { name: 'Deprecated' })).toBeChecked();
  });

  test('deletes a template after confirmation', async ({ page }) => {
    await openTemplate(page, 'E2E delete template');
    await deleteConfirmed(page);

    await expect(page.getByText(WELCOME, { exact: true })).toBeVisible();
    await expect(page.getByText('E2E delete template', { exact: true })).not.toBeVisible();
  });
});

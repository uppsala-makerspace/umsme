import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, expectSearch, sortBy } from './lists';
import { field, action, saveButton, confirmed, deleteConfirmed, openTab } from './forms';

// Groups: list, add, edit, responsible, members and their requests, image,
// delete, and who sees them. Written against the Blaze pages and meant to
// pass against their replacement (see liability.spec.ts).

const STEERING = 'Styrgrupp Keramik';
const PREMISES = 'Lokalgruppen';
const REQUESTS = 'E2E requests group';
const LINKS = 'E2E links group';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const rows = dataRows;

const openGroup = async (page: Page, name: string) => {
  await openAs(page, 'admin', '/groups');
  await page.getByText(name, { exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
};

/** The list item, row or card that holds a member's name in a members section. */
const memberEntry = (page: Page, name: string) => page.getByRole('listitem').filter({ hasText: name })
  .or(page.getByRole('row').filter({ hasText: name }));

test.describe('Groups', () => {
  test('lists the groups with type', async ({ page }) => {
    await openAs(page, 'admin', '/groups');
    await expect(page.getByRole('heading', { name: /^groups$/i })).toBeVisible();
    await expect(rows(page).filter({ hasText: STEERING })).toContainText(/steering/i);
    await expect(rows(page).filter({ hasText: PREMISES })).toContainText(/function/i);
  });

  test('the board sees them too', async ({ page }) => {
    await openAs(page, 'board', '/groups');
    await expect(page.getByText(STEERING, { exact: true })).toBeVisible();
  });

  test('the treasurer does not see them', async ({ page }) => {
    await openAs(page, 'treasurer', '/groups');
    await expect(page.getByRole('heading', { name: /^groups$/i })).toBeVisible();
    await expect(page.getByText(STEERING, { exact: true })).not.toBeVisible();
  });

  test('searches and sorts the list', async ({ page }) => {
    await openAs(page, 'admin', '/groups');
    await expect(page.getByText(STEERING, { exact: true })).toBeVisible();
    await sortBy(page, 'Type', 'descending');
    await expect(rows(page).first()).toContainText(/steering/i);
    await expectSearch(page, 'lokal', PREMISES, STEERING);
  });

  test('adds a group and shows its page', async ({ page }) => {
    await openAs(page, 'admin', '/groups');
    await action(page, /^add group$/i).click();
    await field(page, 'Name (Swedish)').fill('E2E ny grupp');
    await page.getByRole('combobox', { name: 'Type' }).selectOption({ label: 'Function group (funktionsgrupp)' });
    await action(page, /^(add group|save|create)$/i).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E ny grupp');
  });

  test('edits a group', async ({ page }) => {
    await openGroup(page, 'E2E edit group');
    await field(page, 'Description (Swedish, markdown)').fill('En grupp för test.');
    await field(page, 'Slack channel').fill('#e2e-grupp');
    await saveButton(page).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/E2E edit group|^Groups$/);

    await openGroup(page, 'E2E edit group');
    await expect(field(page, 'Description (Swedish, markdown)')).toHaveValue('En grupp för test.');
    await expect(field(page, 'Slack channel')).toHaveValue('#e2e-grupp');
  });

  test('sets the links and the responsible, on save', async ({ page }) => {
    const pill = (name: string) => page.getByRole('button', { name });
    await openGroup(page, LINKS);
    await page.getByRole('combobox', { name: 'Parent group' }).selectOption({ label: STEERING });
    await page.getByRole('combobox', { name: 'Primary space' }).selectOption({ label: 'Stora rummet (Floor 1)' });
    await page.getByRole('combobox', { name: 'Related workshops' }).fill('retro');
    await page.getByRole('listbox').getByRole('option', { name: 'Retrodatorer' }).click();
    await page.getByRole('combobox', { name: 'Related groups' }).fill('lokal');
    await page.getByRole('listbox').getByRole('option', { name: PREMISES }).click();
    await page.getByRole('combobox', { name: 'Responsible' }).fill('Sara Sty');
    await page.getByRole('listbox').getByRole('option', { name: /Sara Styrgrupp/ }).click();
    await saveButton(page).click();
    await expect(page.getByText(/^saved\.?$/i)).toBeVisible();

    await openGroup(page, LINKS);
    await expect(page.getByRole('combobox', { name: 'Parent group' }).locator('option:checked')).toHaveText(STEERING);
    await expect(page.getByRole('combobox', { name: 'Primary space' }).locator('option:checked')).toHaveText('Stora rummet (Floor 1)');
    await expect(pill('Retrodatorer')).toBeVisible();
    await expect(pill(PREMISES)).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Responsible' })).toHaveValue(/Sara Styrgrupp/);
    await openTab(page, /^members/i);
    await expect(memberEntry(page, 'Sara Styrgrupp')).toContainText(/responsible/i);
    await openTab(page, /^details$/i);

    await page.getByRole('img', { name: `Remove ${PREMISES}` }).click();
    await saveButton(page).click();
    await expect(page.getByText(/^saved\.?$/i)).toBeVisible();
    await openGroup(page, LINKS);
    await expect(pill('Retrodatorer')).toBeVisible();
    await expect(pill(PREMISES)).not.toBeVisible();
  });

  test('adds a member', async ({ page }) => {
    await openGroup(page, 'E2E edit group');
    await openTab(page, /^members/i);
    await page.getByRole('combobox', { name: 'New member' }).fill('Dagny');
    await page.getByRole('listbox').getByRole('option', { name: /Dagny Rabatt/ }).click();
    await action(page, /^add member$/i).click();
    await expect(memberEntry(page, 'Dagny Rabatt').getByText(/^remove$/i)).toBeVisible();
  });

  test('shows the responsible, the members and the requests', async ({ page }) => {
    await openGroup(page, STEERING);
    await openTab(page, /^members/i);
    await expect(page.getByRole('link', { name: 'Gustav Gruppledare' }).first()).toBeVisible();
    await expect(memberEntry(page, 'Sara Styrgrupp')).toBeVisible();
  });

  test('approves a request to join', async ({ page }) => {
    await openGroup(page, REQUESTS);
    await openTab(page, /^members/i);
    await memberEntry(page, 'Bo Basmedlem').getByText(/^approve$/i).click();
    await expect(memberEntry(page, 'Bo Basmedlem').getByText(/^approve$/i)).not.toBeVisible();
    await expect(memberEntry(page, 'Bo Basmedlem').getByText(/^remove$/i)).toBeVisible();
  });

  test('rejects a request to join', async ({ page }) => {
    await openGroup(page, REQUESTS);
    await openTab(page, /^members/i);
    await memberEntry(page, 'Kalle Kvartal').getByText(/^reject$/i).click();
    await expect(memberEntry(page, 'Kalle Kvartal')).not.toBeVisible();
  });

  test('removes a member', async ({ page }) => {
    await openGroup(page, REQUESTS);
    await openTab(page, /^members/i);
    page.once('dialog', (dialog) => dialog.accept());
    await memberEntry(page, 'Dagny Rabatt').getByText(/^remove$/i).click();
    await page.getByRole('dialog').getByRole('button', { name: /^remove$/i }).click({ timeout: 3000 }).catch(() => {});
    await expect(memberEntry(page, 'Dagny Rabatt')).not.toBeVisible();
  });

  test('keeps a group that is in use', async ({ page }) => {
    await openGroup(page, STEERING);
    await expect(page.getByText(/can ?not be deleted/i).first()).toBeVisible();
    await openTab(page, /^references \(\d+\)$/i);
    await expect(page.getByRole('heading', { name: /^steers the workshop/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^delete/i })).not.toBeVisible();
  });

  test('uploads and removes an image', async ({ page }) => {
    await openGroup(page, PREMISES);
    await openTab(page, /^image$/i);
    await page.locator('input[type="file"]').setInputFiles({ name: 'grupp.png', mimeType: 'image/png', buffer: PNG });
    await action(page, /^upload image$/i).click();
    await expect(page.getByRole('img', { name: PREMISES })).toBeVisible();
    await confirmed(page, /^remove image$/i);
    await expect(page.getByText(/no image uploaded/i)).toBeVisible();
  });

  test('deletes a group nothing refers to', async ({ page }) => {
    await openGroup(page, 'E2E delete group');
    await deleteConfirmed(page);
    await expect(page.getByText(STEERING, { exact: true })).toBeVisible();
    await expect(page.getByText('E2E delete group', { exact: true })).not.toBeVisible();
  });
});

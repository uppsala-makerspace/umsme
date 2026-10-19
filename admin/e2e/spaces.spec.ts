import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, expectSearch, sortBy } from './lists';
import { field, numberField, action, saveButton, confirmed, deleteConfirmed } from './forms';

// Spaces on the map: list, add, edit, icon, delete, what links to them, and
// who sees them. Written against the Blaze pages and meant to pass unchanged
// against their replacement (see liability.spec.ts for the approach).

const CERAMICS = 'Keramikrummet';
const BIG_ROOM = 'Stora rummet';
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle cx="5" cy="5" r="4"/></svg>');

const spaceRows = dataRows;

// Blaze labels the Slack field only by its placeholder.
const slackField = (page: Page) => field(page, 'Slack channels (comma separated)').or(page.getByPlaceholder('#träverkstaden, #cnc'));

const openSpace = async (page: Page, name: string) => {
  await openAs(page, 'admin', '/spaces');
  await page.getByText(name, { exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
};

test.describe('Spaces', () => {
  test('lists the spaces with map key and floor', async ({ page }) => {
    await openAs(page, 'admin', '/spaces');
    await expect(page.getByRole('heading', { name: /^spaces$/i })).toBeVisible();
    const ceramics = spaceRows(page).filter({ hasText: CERAMICS });
    await expect(ceramics).toContainText('ceramics_workshop');
    await expect(ceramics).toContainText(/floor ?2/i);
  });

  test('the board sees them too', async ({ page }) => {
    await openAs(page, 'board', '/spaces');
    await expect(page.getByText(CERAMICS, { exact: true })).toBeVisible();
  });

  test('the treasurer does not see them', async ({ page }) => {
    await openAs(page, 'treasurer', '/spaces');
    await expect(page.getByRole('heading', { name: /^spaces$/i })).toBeVisible();
    await expect(page.getByText(CERAMICS, { exact: true })).not.toBeVisible();
  });

  test('searches the list', async ({ page }) => {
    await openAs(page, 'admin', '/spaces');
    await expect(page.getByText(CERAMICS, { exact: true })).toBeVisible();
    await expectSearch(page, 'stora', BIG_ROOM, CERAMICS);
  });

  test('sorts the list by floor', async ({ page }) => {
    await openAs(page, 'admin', '/spaces');
    await expect(page.getByText(CERAMICS, { exact: true })).toBeVisible();
    await sortBy(page, 'Floor', 'descending');
    await expect(spaceRows(page).first()).toContainText(/floor ?2/i);
  });

  test('adds a space and shows its page', async ({ page }) => {
    await openAs(page, 'admin', '/spaces');
    await action(page, /^add space$/i).click();
    await field(page, 'Space id (map key)').fill('e2e-new');
    await page.getByRole('combobox', { name: 'Floor' }).selectOption({ label: 'Floor 2' });
    await field(page, 'Name (Swedish)').fill('E2E new space');
    await slackField(page).fill('#keramik, #lera');
    await action(page, /^(add space|save|create)$/i).click();

    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E new space');
    await expect(slackField(page)).toHaveValue('#keramik, #lera');
  });

  test('edits a space', async ({ page }) => {
    await openSpace(page, 'E2E edit space');
    await field(page, 'Name (English)').fill('E2E edited space');
    await field(page, 'Description (Swedish)').fill('Ett rum för test.');
    await numberField(page, 'Icon size').fill('48');
    await saveButton(page).click();

    // Saved: the page shows the new name, or (Blaze) goes back to the list.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/E2E edited space|^Spaces$/);
    await openSpace(page, 'E2E edit space');
    await expect(field(page, 'Description (Swedish)')).toHaveValue('Ett rum för test.');
    await expect(numberField(page, 'Icon size')).toHaveValue('48');
  });

  test('shows what links to a space, and keeps it', async ({ page }) => {
    await openSpace(page, CERAMICS);
    await expect(page.getByRole('link', { name: 'Keramikverkstaden' })).toBeVisible();
    await expect(page.getByText(/can ?not be deleted/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^delete/i })).not.toBeVisible();
  });

  test('uploads and removes an icon', async ({ page }) => {
    await openSpace(page, BIG_ROOM);
    await page.locator('input[type="file"]').setInputFiles({ name: 'room.svg', mimeType: 'image/svg+xml', buffer: SVG });
    await action(page, /^upload icon$/i).click();
    await expect(page.getByRole('img', { name: BIG_ROOM })).toBeVisible();

    await confirmed(page, /^remove icon$/i);
    await expect(page.getByText(/no icon/i)).toBeVisible();
  });

  test('deletes a space nothing links to', async ({ page }) => {
    await openSpace(page, 'E2E delete space');
    await deleteConfirmed(page);

    await expect(page.getByText(CERAMICS, { exact: true })).toBeVisible();
    await expect(page.getByText('E2E delete space', { exact: true })).not.toBeVisible();
  });
});

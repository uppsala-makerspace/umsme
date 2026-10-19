import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, expectSearch, sortBy } from './lists';
import { field, action, saveButton, deleteConfirmed } from './forms';

// Announcements: list, write, edit, the rendered text, going on to send one,
// delete, and who sees them. Sending itself is the mail module's. Written
// against the Blaze pages and meant to pass against their replacement (see
// liability.spec.ts).

const SENT = 'Nyhetsbrev oktober';
const DRAFT = 'Stängt under jul';

const rows = dataRows;

const openAnnouncement = async (page: Page, subject: string) => {
  await openAs(page, 'admin', '/announcements');
  await page.getByText(subject, { exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(subject);
};

/** The Blaze pages edit on a page of their own; the React page edits in place. */
const startEditing = async (page: Page) => {
  const edit = page.getByRole('link', { name: /^edit$/i });
  if (await edit.count()) await edit.click();
};

test.describe('Announcements', () => {
  test('lists them, sent and drafts', async ({ page }) => {
    await openAs(page, 'admin', '/announcements');
    await expect(page.getByRole('heading', { name: /^announcements$/i, level: 1 })).toBeVisible();
    await expect(rows(page).filter({ hasText: SENT })).toContainText(/sent/i);
    await expect(rows(page).filter({ hasText: DRAFT })).toContainText(/draft/i);
  });

  test('the board sees them too', async ({ page }) => {
    await openAs(page, 'board', '/announcements');
    await expect(page.getByText(SENT, { exact: true })).toBeVisible();
  });

  test('the treasurer does not see them', async ({ page }) => {
    await openAs(page, 'treasurer', '/announcements');
    await expect(page.getByRole('heading', { name: /^announcements$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(SENT, { exact: true })).not.toBeVisible();
  });

  test('searches and sorts the list', async ({ page }) => {
    await openAs(page, 'admin', '/announcements');
    await expect(page.getByText(SENT, { exact: true })).toBeVisible();
    await sortBy(page, 'Ämne|Subject', 'descending');
    await expect(rows(page).first()).toContainText(DRAFT);
    await expectSearch(page, 'jul', DRAFT, SENT);
  });

  test('writes a new announcement', async ({ page }) => {
    await openAs(page, 'admin', '/announcements');
    await action(page, /^new announcement$/i).click();
    await page.getByRole('combobox', { name: 'Type' }).selectOption('newsletter');
    await field(page, 'Ämne (Svenska)').fill('E2E nytt utskick');
    await field(page, 'Innehåll (Svenska)').fill('Hej alla!');
    await action(page, /^(save|create|add)$/i).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E nytt utskick');
  });

  test('edits an announcement', async ({ page }) => {
    await openAnnouncement(page, 'E2E edit announcement');
    await startEditing(page);
    await field(page, 'Subject (English)').fill('E2E edited announcement');
    await field(page, 'Content (English)').fill('An announcement for the test.');
    await saveButton(page).click();
    await expect(page.getByText('An announcement for the test.').first()).toBeVisible();

    await openAnnouncement(page, 'E2E edit announcement');
    await expect(page.getByText('E2E edited announcement').first()).toBeVisible();
  });

  test('shows the text as it will read', async ({ page }) => {
    await openAnnouncement(page, SENT);
    await expect(page.getByRole('heading', { name: 'Nyheter' })).toBeVisible();
    await expect(page.locator('strong', { hasText: 'städdag' })).toBeVisible();
    await expect(page.getByRole('link', { name: /view sent mail/i })).toBeVisible();
  });

  test('goes on to send a draft, but not one already sent', async ({ page }) => {
    await openAnnouncement(page, SENT);
    await expect(action(page, /^send$/i)).not.toBeVisible();
    await openAnnouncement(page, DRAFT);
    await action(page, /^send$/i).click();
    await expect(page).toHaveURL(/\/mail\/send\?announcement=/);
  });

  test('deletes an announcement', async ({ page }) => {
    await openAnnouncement(page, 'E2E delete announcement');
    await deleteConfirmed(page);
    await expect(page.getByText(SENT, { exact: true })).toBeVisible();
    await expect(page.getByText('E2E delete announcement', { exact: true })).not.toBeVisible();
  });
});

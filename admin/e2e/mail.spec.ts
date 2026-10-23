import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, search, sortBy } from './lists';
import { field, action, confirmed, deleteConfirmed } from './forms';

// Group mail: the sent mails, a mail's page (its announcement, extracting
// one, deleting it), choosing the recipients and sending one, on its own or
// from an announcement, which goes out in the background. The e2e settings
// deliver mail but let it reach nobody (recipientWhitelist is empty). Begun
// against the Blaze pages; sending in the background and the recipient
// filter came with the React pages.

const rows = dataRows;

const openMail = async (page: Page, subject: string) => {
  await openAs(page, 'admin', '/mail');
  await search(page, subject);
  await rows(page).filter({ hasText: subject }).getByText(subject).click();
  await expect(page).toHaveURL(/\/mail\/\w+$/);
};

/** Write and send a mail on /mail/send: from the first sender, to the current members. */
const send = async (page: Page, subject?: string, text?: string) => {
  await page.getByLabel('kansliet@example.org').check();
  if (subject) await field(page, 'Subject').fill(subject);
  if (text) await field(page, 'Text').fill(text);
  await expect(page.getByText(/member@example\.org/).first()).toBeVisible();
  await confirmed(page, /^(submit|send)( mail)?$/i, /^send/i);
};

test.describe('Mail', () => {
  test('lists, searches and sorts the sent mails', async ({ page }) => {
    await openAs(page, 'admin', '/mail');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/mail/i);
    await sortBy(page, 'Subject', 'ascending');
    await search(page, 'Nyhetsbrev');
    await expect(rows(page).filter({ hasText: 'Nyhetsbrev oktober' })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'E2E delete mail' })).toHaveCount(0);
  });

  test('shows a mail and its announcement', async ({ page }) => {
    await openMail(page, 'Nyhetsbrev oktober');
    // The mail's own text is markdown with a heading of its own.
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(/mail/i);
    await expect(page.getByText('städdag').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /view announcement/i })).toBeVisible();
  });

  test('extracts an announcement from a mail', async ({ page }) => {
    await openMail(page, 'E2E extract mail');
    await action(page, /^extract into announcement$/i).click();
    await expect(page).toHaveURL(/\/announcement\//);
    await expect(page.getByText('E2E extract mail').first()).toBeVisible();
  });

  test('deletes a mail', async ({ page }) => {
    await openMail(page, 'E2E delete mail');
    await deleteConfirmed(page);
    await expect(page).toHaveURL(/\/mail$/);
    await search(page, 'E2E delete mail');
    await expect(rows(page).filter({ hasText: 'E2E delete mail' })).toHaveCount(0);
  });

  test('keeps the mail an announcement was sent as', async ({ page }) => {
    await openMail(page, 'Nyhetsbrev oktober');
    await expect(page.getByRole('link', { name: /view announcement/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^delete/i })).toHaveCount(0);
  });

  test('sends only to those who first paid since a day', async ({ page }) => {
    await openAs(page, 'admin', '/mail/send');
    await expect(page.getByText(/member@example\.org/).first()).toBeVisible();
    await page.getByLabel(/first paid on or after/i).fill('2999-01-01');
    await expect(page.getByText(/nobody in this group/i)).toBeVisible();
  });
});

// One mail goes out at a time, so the tests that send take turns.
test.describe.serial('Sending mail', () => {
  test('sends a mail to the current members', async ({ page }) => {
    await openAs(page, 'admin', '/mail/send');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/send mail/i);
    await send(page, 'E2E sent mail', 'Hej <%= name %>!');
    await expect(page).toHaveURL(/\/mail\/\w+$/);
    await expect(page.getByRole('heading', { level: 1 }).first()).toContainText('E2E sent mail');
    await expect(page.getByRole('heading', { name: /^sent to [1-9]/i })).toBeVisible({ timeout: 15000 });
    await openAs(page, 'admin', '/mail');
    await search(page, 'E2E sent mail');
    await expect(rows(page).filter({ hasText: 'E2E sent mail' })).toBeVisible();
  });

  test('sends an announcement and marks it sent', async ({ page }) => {
    await openAs(page, 'admin', '/announcements');
    await search(page, 'E2E send announcement');
    await rows(page).filter({ hasText: 'E2E send announcement' }).getByText('E2E send announcement').click();
    await action(page, /^send$/i).click();
    await expect(page).toHaveURL(/\/mail\/send\?announcement=/);
    await expect(field(page, 'Subject')).toHaveValue('E2E send announcement');
    // An announcement is for everyone: no choosing of recipients.
    await expect(page.getByText(/every current member/i).first()).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Recipients' })).toHaveCount(0);
    await expect(page.getByLabel(/first paid on or after/i)).toHaveCount(0);
    await send(page);
    await expect(page).toHaveURL(/\/mail\/\w+$/);
    await page.getByRole('link', { name: /view announcement/i }).click();
    await expect(page).toHaveURL(/\/announcement\//);
    await expect(page.getByRole('link', { name: /view sent mail/i })).toBeVisible({ timeout: 15000 });
  });
});

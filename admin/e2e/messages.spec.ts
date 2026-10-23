import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, search } from './lists';
import { confirmed, openTab } from './forms';

// Messages to members: the list on a member's page, one message, deleting
// one, and sending a welcome message from a membership. The e2e settings
// deliver mail but let it reach nobody (recipientWhitelist is empty), so the
// message is sent and kept.
// Written against the Blaze pages and meant to pass against their
// replacement (see liability.spec.ts).

const openUlla = async (page: Page) => {
  await openAs(page, 'admin', '/excluded');
  await dataRows(page).filter({ hasText: 'Ulla Utesluten' }).getByText(/excluded@/).click();
  await expect(page).toHaveURL(/\/member\//);
};

const openMessage = async (page: Page, subject: string) => {
  await openUlla(page);
  await openTab(page, /^messages/i);
  await page.getByText(subject, { exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/message sent to/i);
};

test.describe('Messages', () => {
  test('shows a message sent to a member', async ({ page }) => {
    await openMessage(page, 'E2E visa meddelande');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ulla Utesluten');
    await expect(page.getByRole('textbox', { name: 'Subject' }).or(page.getByText('E2E visa meddelande')).first()).toBeVisible();
  });

  test('deletes a message', async ({ page }) => {
    await openMessage(page, 'E2E radera meddelande');
    await confirmed(page, /^delete message$/i, /^delete/i);
    await expect(page).toHaveURL(/\/member\//);
    await expect(page.getByText('E2E radera meddelande')).toHaveCount(0);
  });

  test('sends a welcome message from a membership and keeps it', async ({ page }) => {
    await openAs(page, 'admin', '/payments');
    await search(page, '901');
    await dataRows(page).filter({ hasText: '901' }).first().click();
    await page.getByRole('link', { name: /connected membership/i }).click();
    await openTab(page, /^messages/i);
    await page.getByRole('button', { name: /welcome/i }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/welcome/i);
    await expect(page.getByRole('textbox', { name: 'Subject' })).toHaveValue(/välkommen/i);
    const subject = 'E2E skickat välkomstmeddelande';
    await page.getByRole('textbox', { name: 'Subject' }).fill(subject);
    await page.getByRole('button', { name: /^(submit|send)/i }).click();
    // Back where it was started: the membership's messages.
    await expect(page).toHaveURL(/\/membership\/\w+\?tab=messages$/);
    await expect(page.getByText(subject).first()).toBeVisible();
  });
});

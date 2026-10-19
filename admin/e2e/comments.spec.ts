import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, search } from './lists';

// Comments, on a member's page and a payment's: adding, editing and
// deleting one. Written against the React section (the Blaze widget had no
// names to find its parts by).

const comments = (page: Page) => page.getByRole('region', { name: 'Comments' });

const openUlla = async (page: Page) => {
  await openAs(page, 'admin', '/excluded');
  await dataRows(page).filter({ hasText: 'Ulla Utesluten' }).getByText(/excluded@/).click();
  await expect(page).toHaveURL(/\/member\//);
};

const add = async (page: Page, text: string) => {
  await comments(page).getByRole('button', { name: /^add comment$/i }).click();
  await comments(page).getByRole('textbox', { name: 'New comment' }).fill(text);
  await comments(page).getByRole('button', { name: /^save comment$/i }).click();
  await expect(comments(page).getByText(text)).toBeVisible();
};

test.describe('Comments', () => {
  test('adds, edits and deletes a comment on a member', async ({ page }) => {
    await openUlla(page);
    await add(page, 'E2E kommentar om Ulla');
    const comment = comments(page).getByRole('article').filter({ hasText: 'E2E kommentar om Ulla' });
    await comment.getByRole('button', { name: /^edit$/i }).click();
    await comments(page).getByRole('textbox', { name: 'Comment' }).fill('E2E ändrad kommentar');
    await comments(page).getByRole('button', { name: /^save comment$/i }).click();
    await expect(comments(page).getByText('E2E ändrad kommentar')).toBeVisible();
    await expect(comments(page).getByText(/modified/i).first()).toBeVisible();

    await openUlla(page);
    await comments(page).getByRole('article').filter({ hasText: 'E2E ändrad kommentar' }).getByRole('button', { name: /^delete$/i }).click();
    await expect(comments(page).getByText('E2E ändrad kommentar')).toHaveCount(0);
  });

  test('adds a comment on a payment', async ({ page }) => {
    await openAs(page, 'admin', '/payments');
    await search(page, 'E2E other payment');
    await dataRows(page).filter({ hasText: 'E2E other payment' }).click();
    await add(page, 'E2E kommentar om betalningen');
  });
});

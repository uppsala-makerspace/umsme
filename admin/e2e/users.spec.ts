import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, search } from './lists';
import { field, action, confirmed } from './forms';

// User accounts: the list, an account's roles, its member, setting its
// password, renaming, deleting and adding one. Accounts of their own in the
// e2e scenario. Written against the Blaze pages and meant to pass against
// their replacement (see liability.spec.ts).

const rows = dataRows;

const openUser = async (page: Page, email: string) => {
  await openAs(page, 'admin', '/users');
  await search(page, email);
  await rows(page).filter({ hasText: email }).getByText(email).click();
  await expect(page).toHaveURL(/\/user\//);
};

test.describe('Users', () => {
  test('lists the accounts', async ({ page }) => {
    await openAs(page, 'admin', '/users');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/user/i);
    await search(page, 'member@example.org');
    await expect(rows(page).filter({ hasText: 'member@example.org' })).toBeVisible();
  });

  test('shows an account’s member and roles', async ({ page }) => {
    await openUser(page, 'board@example.org');
    await expect(page.getByRole('link', { name: /member: Bertil Styrelse/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /remove from board/i })).toBeVisible();
  });

  test('gives an account a role and takes it back', async ({ page }) => {
    await openUser(page, 'e2e-user-roles@example.org');
    await page.getByRole('button', { name: /add to treasurer/i }).click();
    await expect(page.getByRole('button', { name: /remove from treasurer/i })).toBeVisible();
    await page.getByRole('button', { name: /remove from treasurer/i }).click();
    await expect(page.getByRole('button', { name: /add to treasurer/i })).toBeVisible();
  });

  test('sets a new password', async ({ page }) => {
    await openUser(page, 'e2e-user-password@example.org');
    // The Blaze page's labels name no field, and a password field has no role.
    await page.getByLabel(/new password/i).or(page.locator('input[type="password"]')).first().fill('newpassword123');
    await action(page, /^reset password$/i).click();
    await action(page, /^yes, set the new password$/i).click();
    await expect(page.getByText(/password has been changed/i)).toBeVisible();
  });

  test('deletes an account', async ({ page }) => {
    await openUser(page, 'e2e-user-delete@example.org');
    await confirmed(page, /^delete( user| account)?$/i, /^delete/i);
    await expect(page).toHaveURL(/\/users$/);
    await search(page, 'e2e-user-delete@example.org');
    await expect(rows(page).filter({ hasText: 'e2e-user-delete@example.org' })).toHaveCount(0);
  });

  test('adds an account', async ({ page }) => {
    await openAs(page, 'admin', '/users');
    await action(page, /^add user$/i).click();
    await page.getByLabel(/username/i).or(page.getByRole('textbox').first()).first().fill('e2e-new-user');
    await page.getByLabel(/^password/i).or(page.locator('input[type="password"]')).first().fill('password123');
    await action(page, /^add user$/i).click();
    await expect(page).toHaveURL(/\/user\//);
    await expect(field(page, 'Username')).toHaveValue('e2e-new-user');
  });
});

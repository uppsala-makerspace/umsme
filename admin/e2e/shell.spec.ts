import { test, expect } from '@playwright/test';
import { openAs, testUsers } from './helpers';

// Admin's frame: signing in and out with the form, the menu by role, and
// moving between pages without reloading.

test.describe('Admin frame', () => {
  test('signs in with a password and out again', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByRole('heading', { name: 'You have to sign in first!' })).toBeVisible();
    await page.getByLabel(/username or email/i).fill(testUsers.board.email);
    await page.getByLabel(/^password/i).fill(testUsers.board.password);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/members/i);
    await page.getByRole('button', { name: new RegExp(testUsers.board.email) }).click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();
    await expect(page.getByRole('heading', { name: 'You have to sign in first!' })).toBeVisible();
  });

  test('refuses a wrong password', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/username or email/i).fill(testUsers.board.email);
    await page.getByLabel(/^password/i).fill('wrong-password');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page.getByText(/wrong username or password/i)).toBeVisible();
  });

  test('goes between pages through the menu without reloading', async ({ page }) => {
    await openAs(page, 'admin', '/');
    await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeVisible();
    await page.evaluate(() => { (window as any).stayed = true; });
    await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Payments' }).click();
    await expect(page).toHaveURL(/\/payments$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/payments/i);
    expect(await page.evaluate(() => (window as any).stayed)).toBe(true);
    // Each page is loaded when first shown: one with charts too, still without a reload.
    await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Activity' }).click();
    await expect(page.getByRole('heading', { name: /^activity$/i, level: 1 })).toBeVisible();
    expect(await page.evaluate(() => (window as any).stayed)).toBe(true);
    await page.goBack();
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeVisible();
  });

  test('offers a reload when a page cannot be loaded', async ({ page }) => {
    await openAs(page, 'admin', '/');
    await expect(page.getByRole('heading', { name: 'Welcome!' })).toBeVisible();
    // Meteor fetches the modules a page needs over HTTP; refuse them, as during a deploy.
    await page.route('**/__meteor__/dynamic-import/**', (route) => route.abort());
    await page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Payments' }).click();
    await expect(page.getByText(/The page could not be loaded/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible();
  });

  test('shows the storage role its page only', async ({ page }) => {
    await openAs(page, 'storage', '/');
    const menu = page.getByRole('navigation', { name: 'Admin' });
    await expect(menu.getByRole('link', { name: 'Storage' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Payments' })).toHaveCount(0);
  });

  test('says so for a page that does not exist', async ({ page }) => {
    await openAs(page, 'admin', '/no-such-page');
    await expect(page.getByRole('heading', { name: /no such page/i })).toBeVisible();
  });
});

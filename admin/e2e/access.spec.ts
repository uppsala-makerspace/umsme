import { test, expect } from '@playwright/test';
import { openAs, testUsers } from './helpers';

// Smoke tests for the e2e setup: who gets into admin, and that the seeded
// data is there.

test.describe('Access to admin', () => {
  test('admin sees the member list with the seeded members', async ({ page }) => {
    await openAs(page, 'admin', '/members');
    await expect(page.getByRole('heading', { name: 'Member List' })).toBeVisible();
    await page.getByRole('searchbox').fill(testUsers.member.name!);
    await expect(page.getByRole('link', { name: testUsers.member.name! })).toBeVisible();
  });

  test('the storage role reaches the storage page', async ({ page }) => {
    await openAs(page, 'storage', '/storage');
    await expect(page.getByRole('heading', { name: 'Storage', exact: true })).toBeVisible();
  });

  test('a member without an admin role is not let in', async ({ page }) => {
    await openAs(page, 'member', '/members');
    await expect(page.getByRole('heading', { name: 'You have to sign in first!' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Member List' })).not.toBeVisible();
  });

  test('without logging in, admin asks you to sign in', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByRole('heading', { name: 'You have to sign in first!' })).toBeVisible();
  });
});

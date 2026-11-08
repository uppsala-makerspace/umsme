import { test, expect, type Page } from '@playwright/test';
import { openAs, testUsers } from './helpers';
import en from '../imports/i18n/en.json';

// Switch user: the account named admin views the app as another member, read
// only, and switches back. `adminAccount` is that account (no email, no
// member); `admin` is a member with the admin role, which is not enough.

const openMenu = (page: Page) => page.getByRole('button', { name: '☰' }).click();
const switchUserLink = (page: Page) => page.getByRole('link', { name: en.impersonationMenu });

const switchTo = async (page: Page, query: string, name: string) => {
  await openAs(page, 'adminAccount', '/impersonate');
  await page.getByRole('searchbox').fill(query);
  await page.getByRole('button', { name: en.impersonationSearch, exact: true }).click();
  await page.getByRole('button', { name: new RegExp(name) }).click();
  await expect(page.getByText(en.impersonationViewingAs.replace('{{name}}', name))).toBeVisible();
};

test.describe('Switch user', () => {
  test('is offered to the admin account, which has no member', async ({ page }) => {
    await openAs(page, 'adminAccount');
    await openMenu(page);
    await expect(switchUserLink(page)).toBeVisible();
  });

  test('is not offered to a member with the admin role', async ({ page }) => {
    await openAs(page, 'admin');
    await openMenu(page);
    await expect(page.getByRole('link', { name: en.myAccount })).toBeVisible();
    await expect(switchUserLink(page)).toHaveCount(0);
  });

  test('is closed to a member with the admin role who goes to the page', async ({ page }) => {
    await openAs(page, 'admin', '/impersonate');
    await expect(page).not.toHaveURL(/\/impersonate/);
  });

  test('finds a member by member number', async ({ page }) => {
    await openAs(page, 'adminAccount', '/impersonate');
    await page.getByRole('searchbox').fill(testUsers.board.mid!);
    await page.getByRole('button', { name: en.impersonationSearch, exact: true }).click();
    await expect(page.getByRole('button', { name: /Bertil Styrelse/ })).toBeVisible();
  });

  test('shows the app as the member, read only, and switches back', async ({ page }) => {
    await switchTo(page, 'Bertil', 'Bertil Styrelse');

    // The member's own view: their name, their menu, no switch-user entry.
    await expect(page.getByText(/Bertil/).first()).toBeVisible();
    await openMenu(page);
    await expect(page.getByRole('link', { name: en.myAccount })).toBeVisible();
    await expect(switchUserLink(page)).toHaveCount(0);
    await page.keyboard.press('Escape');

    // Reading works, changing does not.
    const outcome = await page.evaluate(async () => {
      const Meteor = (window as any).Meteor;
      const read = await Meteor.callAsync('findInfoForUser').then(() => 'ok', (e: any) => e.error);
      const write = await Meteor.callAsync('updateNotificationPrefs', {}).then(() => 'ok', (e: any) => e.error);
      return { read, write };
    });
    expect(outcome).toEqual({ read: 'ok', write: 'impersonation-read-only' });

    // Survives a reload. A new page in the same context, since openAs's init
    // script would put the admin's token back on a reload.
    const reloaded = await page.context().newPage();
    await reloaded.goto('/');
    await expect(reloaded.getByText(en.impersonationViewingAs.replace('{{name}}', 'Bertil Styrelse'))).toBeVisible();

    await reloaded.getByRole('button', { name: en.impersonationSwitchBack }).click();
    await expect(reloaded).toHaveURL(/\/impersonate$/);
    await expect(reloaded.getByRole('heading', { name: en.impersonationTitle })).toBeVisible();
    await expect(reloaded.getByText(en.impersonationViewingAs.replace('{{name}}', 'Bertil Styrelse'))).toHaveCount(0);
  });
});

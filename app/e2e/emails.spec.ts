import { test, expect } from '@playwright/test';
import { openAs } from './helpers';
import en from '../imports/i18n/en.json';
import { E2E_MERGE_TOKEN } from '../imports/common/server/seed/scenarios/personas.js';

// A member's email addresses: the list, adding one (unverified), making a
// verified one primary, removing one, and merging another account into one's
// own, by a request and by the link mailed to the other address.

const t = (key: string, values: Record<string, string> = {}) =>
  Object.entries(values).reduce((text, [k, v]) => text.replace(`{{${k}}}`, v), (en as Record<string, string>)[key]);

test.describe('Email addresses', () => {
  test('lists the addresses, adds one, makes another primary and removes one', async ({ page }) => {
    // Reached from the account page.
    await openAs(page, 'emailsOwner', '/account');
    await page.getByRole('button', { name: en.emailsLink }).click();
    await expect(page).toHaveURL(/\/account\/emails$/);
    const row = (address: string) => page.getByRole('listitem').filter({ hasText: address });
    await expect(row('emails-owner@example.org')).toContainText(en.emailPrimary);
    await expect(row('emails-owner-work@example.org')).toContainText(en.emailVerified);
    // The primary one can be neither removed nor made primary.
    await expect(row('emails-owner@example.org').getByRole('button')).toHaveCount(0);

    await page.getByLabel(en.emailAdd).fill('emails-owner-new@example.org');
    await page.getByRole('button', { name: en.emailAddButton }).click();
    await expect(row('emails-owner-new@example.org')).toContainText(en.emailNotVerified);
    await expect(page.getByRole('status')).toContainText('emails-owner-new@example.org');
    // An unverified one cannot be primary.
    await expect(row('emails-owner-new@example.org').getByRole('button', { name: en.emailMakePrimary })).toHaveCount(0);
    await row('emails-owner-new@example.org').getByRole('button', { name: en.emailRemove }).click();
    await expect(row('emails-owner-new@example.org')).toHaveCount(0);

    await row('emails-owner-work@example.org').getByRole('button', { name: en.emailMakePrimary }).click();
    await expect(row('emails-owner-work@example.org')).toContainText(en.emailPrimary);
    await expect(row('emails-owner@example.org')).not.toContainText(en.emailPrimary);
    // Still the same member, now found by the new primary address.
    await page.goto('/');
    await expect(page.getByText(/Emil/).first()).toBeVisible();
  });

  test('an address of another account offers to ask to merge it', async ({ page }) => {
    await openAs(page, 'emailsOwner', '/account/emails');
    await page.getByLabel(en.emailAdd).fill('expired@example.org');
    await page.getByRole('button', { name: en.emailAddButton }).click();
    await expect(page.getByText(t('emailTaken', { address: 'expired@example.org' }))).toBeVisible();
    await page.getByRole('button', { name: en.emailRequestMerge }).click();
    await expect(page.getByRole('status')).toContainText(t('emailMergeRequested', { address: 'expired@example.org' }));
  });

  test('the link to the other address merges the accounts and the members', async ({ page }) => {
    // Signed in as the new account, without memberships, as the person would be.
    await openAs(page, 'mergeRequester', `/merge-account/${E2E_MERGE_TOKEN}`);
    await expect(page.getByText(t('mergeExplain', { removed: 'merge-other@example.org', kept: 'merge-requester@example.org' }))).toBeVisible();
    await expect(page.getByText(t('mergeMember', { name: 'Paula Betald' }))).toBeVisible();
    await page.getByRole('button', { name: en.mergeConfirm }).click();
    await expect(page.getByRole('status')).toContainText(t('mergeDone', { kept: 'merge-requester@example.org', removed: 'merge-other@example.org' }));

    // Same session, now with the paid member and both addresses.
    await page.goto('/account/emails');
    await expect(page.getByRole('listitem').filter({ hasText: 'merge-other@example.org' })).toContainText(en.emailVerified);
    await page.goto('/');
    await expect(page.getByText(/Paula/).first()).toBeVisible();

    // The link works once.
    await page.goto(`/merge-account/${E2E_MERGE_TOKEN}`);
    await expect(page.getByText(en.mergeUsed)).toBeVisible();
  });
});

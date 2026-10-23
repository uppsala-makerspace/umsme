import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, search, sortBy } from './lists';
import { field, action, createButton, saveButton, confirmed, openTab } from './forms';

// Members: the list, a member's page (status, details, registration,
// exclusion, deletion, dates out of step) and the family (members, adding
// an existing one, removing one, invites). Every test that changes a member
// has a member of its own, found by member number (see the e2e scenario).
// Written against the Blaze pages and meant to pass against their
// replacement (see liability.spec.ts).

const rows = dataRows;

/** A member's page, through the members list: search for the member number and open the row. */
const openMember = async (page: Page, mid: string) => {
  await openAs(page, 'admin', '/members');
  // By the email, which only this member has: the list fetches again a moment
  // after the typing stops, and a click on a row it is about to replace is
  // lost, so wait for the one row the search leaves.
  await search(page, `e2e-${mid}@example.org`);
  await expect(rows(page)).toHaveCount(1);
  await rows(page).filter({ hasText: `e2e-${mid}@example.org` }).getByText(`e2e-${mid}@example.org`).click();
  await expect(page).toHaveURL(/\/member\//);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/member/i);
};

test.describe('Members', () => {
  test('lists, searches and sorts the members', async ({ page }) => {
    await openAs(page, 'admin', '/members');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/member/i);
    await expect(rows(page).first()).toBeVisible();
    await sortBy(page, 'Name', 'ascending');
    await search(page, '905');
    await expect(rows(page).filter({ hasText: 'e2e-905@example.org' })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'Maja Medlem' })).toHaveCount(0);
  });

  test('shows a member’s status', async ({ page }) => {
    await openMember(page, '905');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E edit member');
    await expect(page.getByText(/member to:\s*\d{4}-\d\d-\d\d/i)).toBeVisible();
  });

  test('edits a member', async ({ page }) => {
    await openMember(page, '905');
    await field(page, 'Mobile').fill('0701234905');
    await saveButton(page).click();
    await openMember(page, '905');
    await expect(field(page, 'Mobile')).toHaveValue('0701234905');
  });

  test('puts dates out of step with the memberships right', async ({ page }) => {
    await openMember(page, '913');
    await expect(page.getByText(/not in sync/i)).toBeVisible();
    await action(page, /^update( dates)?!?$/i).click();
    await expect(page.getByText(/not in sync/i)).not.toBeVisible();
    await expect(page.getByText(/member to:/i)).toBeVisible();
  });

  test('accepts a member', async ({ page }) => {
    await openMember(page, '907');
    await expect(page.getByText(/not registered/i)).toBeVisible();
    await action(page, /^accept member$/i).click();
    await expect(page.getByText(/^registered$/i)).toBeVisible();
  });

  test('excludes a member and reinstates them', async ({ page }) => {
    await openMember(page, '908');
    await confirmed(page, /^exclude$/i, /^exclude/i);
    await expect(action(page, /^reinstate$/i)).toBeVisible();
    await action(page, /^reinstate$/i).click();
    await expect(action(page, /^exclude$/i)).toBeVisible();
  });

  test('deletes a member', async ({ page }) => {
    await openMember(page, '906');
    await confirmed(page, /^delete( member)?$/i, /^delete/i);
    await expect(page).toHaveURL(/\/members$/);
    await search(page, '906');
    await expect(rows(page).filter({ hasText: 'E2E delete member' })).toHaveCount(0);
  });

  test('adds a member', async ({ page }) => {
    await openAs(page, 'admin', '/members');
    await action(page, /^add member$/i).click();
    await field(page, 'Name').fill('E2E ny medlem');
    await field(page, 'Email').fill('e2e-ny-medlem@example.org');
    await createButton(page).or(action(page, /^add member$/i)).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E ny medlem');
  });
});

test.describe('Family', () => {
  test('shows the family members and the pending invites', async ({ page }) => {
    await openMember(page, '909');
    await openTab(page, /^family members/i);
    await expect(page.getByRole('heading', { name: /family members/i })).toBeVisible();
    await expect(page.getByText('E2E family dependent').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /pending invites/i })).toBeVisible();
  });

  test('adds an existing member to the family', async ({ page }) => {
    await openMember(page, '909');
    await openTab(page, /^family members/i);
    await action(page, /^add existing( member)?$/i).click();
    await search(page, '910');
    await rows(page).filter({ hasText: 'E2E family candidate' }).getByText('e2e-910@example.org').click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E family payer');
    await expect(page.getByText('E2E family candidate').first()).toBeVisible();
  });

  test('removes a member from the family', async ({ page }) => {
    await openMember(page, '911');
    await openTab(page, /^family members/i);
    await expect(page.getByRole('heading', { name: /paying family member/i })).toBeVisible();
    await confirmed(page, /^remove from family$/i, /^remove/i);
    await expect(page.getByRole('heading', { name: /paying family member/i })).not.toBeVisible();
  });

  test('cancels an invite', async ({ page }) => {
    await openMember(page, '909');
    await openTab(page, /^family members/i);
    await expect(page.getByText('e2e-cancel-invite@example.org')).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('listitem').filter({ hasText: 'e2e-cancel-invite@example.org' }).getByText(/^cancel( invite)?$/i).click();
    await page.getByRole('dialog').getByRole('button', { name: /^cancel invite$/i }).click({ timeout: 3000 }).catch(() => {});
    await expect(page.getByText('e2e-cancel-invite@example.org')).not.toBeVisible();
  });

  test('declines an invite to another family', async ({ page }) => {
    await openMember(page, '912');
    await openTab(page, /^family members/i);
    await expect(page.getByRole('heading', { name: /invitations to other families/i })).toBeVisible();
    await confirmed(page, /^decline$/i, /^decline/i);
    await expect(page.getByRole('heading', { name: /invitations to other families/i })).not.toBeVisible();
  });
});

test.describe('Member tabs', () => {
  test('keeps the tab in the URL, and Back goes to the tab before', async ({ page }) => {
    await openMember(page, '909');
    await expect(page.getByRole('tab', { name: /^details$/i, selected: true })).toBeVisible();
    await openTab(page, /^memberships \(\d+\)$/i);
    await expect(page).toHaveURL(/\?tab=memberships$/);
    await expect(action(page, /^add membership$/i)).toBeVisible();
    await openTab(page, /^family members/i);
    await expect(page).toHaveURL(/\?tab=family$/);
    await page.goBack();
    await expect(page.getByRole('tab', { name: /^memberships/i, selected: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('tab', { name: /^memberships/i, selected: true })).toBeVisible();
  });

  test('opens a tab from a link, and keeps unsaved details across tabs', async ({ page }) => {
    await openMember(page, '905');
    const url = page.url();
    await field(page, 'Mobile').fill('0709999905');
    await openTab(page, /^comments/i);
    await openTab(page, /^details$/i);
    await expect(field(page, 'Mobile')).toHaveValue('0709999905');
    await page.goto(`${url}?tab=messages`);
    await expect(page.getByRole('tab', { name: /^messages/i, selected: true })).toBeVisible();
  });

  test('has no memberships or messages for a family member', async ({ page }) => {
    // Frida Familj, whom no test takes out of her family.
    await openAs(page, 'admin', '/members');
    await search(page, 'family-member@example.org');
    await expect(rows(page)).toHaveCount(1);
    await rows(page).filter({ hasText: 'family-member@example.org' }).getByText('family-member@example.org').click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Frida Familj');
    await expect(page.getByRole('tab', { name: /^family members/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^memberships/i })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /^messages/i })).toHaveCount(0);
  });
});

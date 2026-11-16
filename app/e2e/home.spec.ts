import { test, expect } from '@playwright/test';
import { openAs } from './helpers';
import en from '../imports/i18n/en.json';

// The home page's cards: the counts on them. Read-only.
test.describe('Home', () => {
  test('the Expenses card says, in red, how many expenses wait for my approval, and opens them', async ({ page }) => {
    // The group leader approves on the ceramics account, where two expenses are submitted (scenarios/e2e.js).
    await openAs(page, 'groupLeader', '/');
    // The badge comes first in the card.
    const card = page.getByRole('link', { name: `2 ${en.expenses}`, exact: true });
    await expect(card).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(/\/expenses\?tab=approve$/);
    await expect(page.getByRole('heading', { name: en.expensesToApprove })).toBeVisible();
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(2);
  });

  test('the board counts only what is theirs to approve, and sees the others below', async ({ page }) => {
    // The board may approve every expense, but only the one on the account
    // naming no approvers is theirs; the ceramics ones have their approvers.
    await openAs(page, 'board', '/');
    const card = page.getByRole('link', { name: `1 ${en.expenses}`, exact: true });
    await expect(card).toBeVisible();
    await card.click();
    const mine = page.locator('section', { has: page.getByRole('heading', { name: en.expensesToApprove }) });
    await expect(mine.getByRole('listitem')).toHaveCount(1);
    await expect(mine.getByText('Obevakat utlägg')).toBeVisible();
    const others = page.locator('section', { has: page.getByRole('heading', { name: en.expensesOtherToApprove }) });
    await expect(others.getByText('Keramik').first()).toBeVisible();
    await expect(others.getByText('Obevakat utlägg')).toHaveCount(0);
  });

  test('the calendar tab says, in red, how many events to come I have a seat at', async ({ page }) => {
    // Base has a seat at E2E full and E2E participants (scenarios/e2e.js); no test changes them.
    await openAs(page, 'base', '/');
    const nav = page.getByRole('navigation').last();
    await expect(nav.getByRole('link', { name: new RegExp(`^2\\s*${en.navCalendar}$`) })).toBeVisible();
  });

  test('one with no seat at an event to come sees no count on the calendar tab', async ({ page }) => {
    await openAs(page, 'groupLeader', '/');
    const nav = page.getByRole('navigation').last();
    await expect(nav.getByRole('link', { name: en.navCalendar, exact: true })).toBeVisible();
  });

  test('one with nothing to approve sees no count on the Expenses card', async ({ page }) => {
    await openAs(page, 'member', '/');
    await expect(page.getByRole('main').getByText(en.expenses, { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: new RegExp(`^\\d+ ${en.expenses}$`) })).toHaveCount(0);
  });
});

import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows } from './lists';
import { field, action, saveButton, confirmed, deleteConfirmed, openTab } from './forms';

// Expenses and expense accounts: the lists and work queues, confirming,
// rejecting, reimbursing and undoing it, and the accounts with their budget,
// groups and approvers. The fixtures are in the e2e scenario, each expense
// named by its place. Written against the Blaze pages and meant to pass
// against their replacement (see liability.spec.ts).

const rows = dataRows;

const openExpense = async (page: Page, persona: string, place: string) => {
  await openAs(page, persona, '/expenses');
  await page.getByText(place, { exact: true }).click();
  await expect(page.getByText(place, { exact: true }).first()).toBeVisible();
  await expect(page).toHaveURL(/\/expense\//);
};

const openAccount = async (page: Page, name: string) => {
  await openAs(page, 'admin', '/expenses/accounts');
  await page.getByText(name, { exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
};

test.describe('Expenses', () => {
  test('lists the expenses and filters them by status', async ({ page }) => {
    await openAs(page, 'admin', '/expenses');
    await expect(page.getByRole('heading', { name: /^expenses$/i, level: 1 })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'E2E draft' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('submitted');
    await expect(rows(page).filter({ hasText: 'E2E confirm' })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'E2E draft' })).toHaveCount(0);
  });

  test('the treasurer sees them', async ({ page }) => {
    await openAs(page, 'treasurer', '/expenses');
    await expect(rows(page).filter({ hasText: 'E2E draft' })).toBeVisible();
  });

  test('the storage operator does not', async ({ page }) => {
    await openAs(page, 'storage', '/expenses');
    await expect(page.getByText('E2E draft')).not.toBeVisible();
  });

  test('lists what waits to be confirmed, and what to reimburse or pay', async ({ page }) => {
    await openAs(page, 'admin', '/expenses/confirm');
    await expect(page.getByRole('heading', { name: /expenses to confirm/i, level: 1 })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'E2E reject' })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'E2E queued' })).toHaveCount(0);

    await openAs(page, 'treasurer', '/expenses/reimburse');
    await expect(page.getByRole('heading', { name: /invoices to pay/i })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'E2E invoice' })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'E2E queued' })).toBeVisible();
    await page.getByRole('button', { name: /^reimbursed$/i }).click();
    await expect(rows(page).filter({ hasText: 'E2E paid' })).toContainText('480');
  });

  test('confirms an expense', async ({ page }) => {
    await openExpense(page, 'admin', 'E2E confirm');
    await confirmed(page, /^confirm$/i);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/confirmed/i);
  });

  test('rejects an expense with a reason', async ({ page }) => {
    await openExpense(page, 'admin', 'E2E reject');
    await action(page, /^reject/i).click();
    await page.getByLabel(/reason for rejection/i).fill('Kvittot saknas.');
    await action(page, /^reject expense$/i).click();
    await expect(page.getByText(/kvittot saknas/i)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/rejected/i);
  });

  test('marks an expense reimbursed', async ({ page }) => {
    await openExpense(page, 'treasurer', 'E2E reimburse');
    await page.getByLabel(/bookkeeping account/i).selectOption('5010');
    await confirmed(page, /^mark as reimbursed$/i, /^(mark as reimbursed|yes|ok|confirm)/i);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/reimbursed/i);
  });

  test('undoes a reimbursement', async ({ page }) => {
    await openExpense(page, 'treasurer', 'E2E unreimburse');
    await confirmed(page, /^undo "?mark as reimbursed"?$/i, /^(undo|yes|ok|confirm|move back)/i);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/confirmed/i);
  });
});

test.describe('Expense accounts', () => {
  test('lists the accounts', async ({ page }) => {
    await openAs(page, 'admin', '/expenses/accounts');
    await expect(page.getByRole('heading', { name: /^expense accounts$/i, level: 1 })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'Keramik' })).toBeVisible();
  });

  test('shows the budget, groups and approvers, and keeps an account in use', async ({ page }) => {
    await openAccount(page, 'Keramik');
    await expect(page.getByRole('link', { name: 'Styrgrupp Keramik' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Gustav Gruppledare' }).first()).toBeVisible();
    await expect(page.getByText(/can no longer be deleted/i)).toBeVisible();
    await openTab(page, /^budget$/i);
    await expect(page).toHaveURL(/\?tab=budget$/);
    await expect(page.getByText(/5\s000 kr/).first()).toBeVisible();
  });

  test('adds an account', async ({ page }) => {
    await openAs(page, 'admin', '/expenses/accounts');
    await action(page, /^add expense account$/i).click();
    await field(page, 'Name').fill('E2E nytt konto');
    await field(page, 'Explanation').fill('Ett nytt konto.');
    await action(page, /^(add expense account|save|create|add)$/i).click();
    await expect(page.getByText('E2E nytt konto').first()).toBeVisible();
  });

  test('edits an account', async ({ page }) => {
    await openAccount(page, 'E2E edit account');
    await field(page, 'Explanation').fill('Ett konto för test.');
    await saveButton(page).click();
    await expect(page.getByText(/E2E edit account/).first()).toBeVisible();
    await openAccount(page, 'E2E edit account');
    await expect(field(page, 'Explanation')).toHaveValue('Ett konto för test.');
  });

  test('sets a budget', async ({ page }) => {
    await openAccount(page, 'E2E budget account');
    await openTab(page, /^budget$/i);
    await page.getByRole('spinbutton', { name: /budget \(kr\)/i }).fill('1500');
    await action(page, /^set( budget)?$/i).click();
    await expect(page.getByText(/1\s500 kr/).first()).toBeVisible();
  });

  test('sets the groups and approvers, on save', async ({ page }) => {
    await openAccount(page, 'E2E links account');
    await page.getByRole('combobox', { name: 'Groups', exact: true }).fill('keramik');
    await page.getByRole('listbox').getByRole('option', { name: 'Styrgrupp Keramik' }).click();
    await page.getByRole('combobox', { name: 'Approvers', exact: true }).fill('Gustav');
    await page.getByRole('listbox').getByRole('option', { name: 'Gustav Gruppledare' }).click();
    await saveButton(page).click();
    await expect(page.getByText(/^saved\.?$/i)).toBeVisible();

    await openAccount(page, 'E2E links account');
    await expect(page.getByRole('link', { name: 'Gustav Gruppledare' })).toBeVisible();
    await page.getByRole('img', { name: 'Remove Styrgrupp Keramik' }).click();
    await expect(page.getByText(/saving removes this approver/i)).toContainText('Gustav Gruppledare');
  });

  test('deletes an account nothing uses', async ({ page }) => {
    await openAccount(page, 'E2E delete account');
    await deleteConfirmed(page);
    await expect(page.getByText('Keramik', { exact: true })).toBeVisible();
    await expect(page.getByText('E2E delete account', { exact: true })).not.toBeVisible();
  });
});

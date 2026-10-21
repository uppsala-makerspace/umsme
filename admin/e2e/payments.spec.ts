import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, search } from './lists';
import { field, action, createButton, saveButton, confirmed, deleteConfirmed } from './forms';

// Payments and memberships: the payment lists, synchronizing the bank
// against the fake bank ("bankproxy": "fake"), filing a payment by hand,
// and a membership's page. The fixtures are in the e2e scenario. Written
// against the Blaze pages and meant to pass against their replacement (see
// liability.spec.ts).

const rows = dataRows;

const openTab = async (page: Page, tab: RegExp) => {
  await openAs(page, 'admin', '/payments');
  await page.getByRole('link', { name: tab }).or(page.getByRole('tab', { name: tab })).first().click();
};

/** Open a manual payment by something its row shows, the message say. */
const openPayment = async (page: Page, text: string) => {
  await openTab(page, /^manual$/i);
  await search(page, text);
  await rows(page).filter({ hasText: text }).first().click();
  await expect(page).toHaveURL(/\/payment\//);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/payment/i);
};

/** A member's membership, by the member number its bank payment carries. */
const openMembership = async (page: Page, mid: string, name: string) => {
  await openPayment(page, mid);
  await page.getByRole('link', { name: /connected membership/i }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
};

test.describe('Payments', () => {
  test('lists the payments by kind', async ({ page }) => {
    await openAs(page, 'admin', '/payments');
    await expect(page.getByRole('heading', { name: /^payments$/i, level: 1 })).toBeVisible();
    await expect(rows(page).filter({ hasText: 'E2E connect payment' })).toBeVisible();
    await openTab(page, /^automatic$/i);
    await expect(rows(page).first()).toContainText(/swish/i);
    await openTab(page, /^purchases$/i);
    await expect(rows(page).filter({ hasText: /lera/i }).first()).toBeVisible();
  });

  test('is not for the treasurer', async ({ page }) => {
    await openAs(page, 'treasurer', '/payments');
    await expect(page.getByText('E2E connect payment')).not.toBeVisible();
  });

  test('synchronizes the bank', async ({ page }) => {
    await openTab(page, /^manual$/i);
    await page.getByRole('textbox', { name: /personal number/i }).fill('199001011234');
    await page.getByRole('button', { name: /update|save/i }).first().click();
    await expect(page.getByText(/uninitiated|not signed in/i).first()).toBeVisible();
    await page.getByRole('button', { name: /^sign ?in/i }).click();
    await expect(page.getByRole('button', { name: /synch?roni[sz]e/i })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /synch?roni[sz]e/i }).click();
    await search(page, 'E2E bank');
    await expect(rows(page).filter({ hasText: 'E2E bank medlemskap' })).toBeVisible();
  });

  test('shows an untreated payment, waiting for a member', async ({ page }) => {
    await openPayment(page, 'E2E connect payment');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/untreated/i);
    await expect(page.getByRole('heading', { name: /connect to member/i })).toBeVisible();
  });

  test('connects a payment to a member', async ({ page }) => {
    await openPayment(page, 'E2E connect payment');
    await page.getByRole('combobox', { name: 'Member', exact: true }).fill('Maja');
    await page.getByRole('listbox').getByRole('option', { name: /Maja Medlem/ }).click();
    await page.getByRole('button', { name: /^connect$/i }).click();
    await expect(page.getByRole('heading', { name: /connected to member/i })).toContainText('Maja Medlem');
  });

  test('marks a payment as for another purpose', async ({ page }) => {
    await openPayment(page, 'E2E other payment');
    await action(page, /^(switch|mark as other)/i).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/other/i);
  });

  test('deletes a payment', async ({ page }) => {
    await openPayment(page, 'E2E delete payment');
    await deleteConfirmed(page);
    await openTab(page, /^manual$/i);
    await search(page, 'E2E delete payment');
    await expect(rows(page).filter({ hasText: 'E2E delete payment' })).toHaveCount(0);
  });

  test('makes a membership from a payment', async ({ page }) => {
    await openPayment(page, 'E2E membership payment');
    await expect(page.getByRole('heading', { name: /connected to member/i })).toContainText('Nora Ny');
    await action(page, /^new( membership)?$/i).click();
    await expect(field(page, 'Amount').or(page.getByRole('spinbutton', { name: 'Amount' }))).toHaveValue('200');
    await createButton(page).or(action(page, /^add membership$/i)).first().click();
    await expect(page.getByRole('link', { name: /connected membership/i })).toBeVisible();
  });
});

test.describe('Memberships', () => {
  test('edits a membership', async ({ page }) => {
    await openMembership(page, '901', 'E2E edit membership');
    await page.getByRole('spinbutton', { name: 'Amount' }).first().fill('250');
    await saveButton(page).click();
    await expect(page).toHaveURL(/\/member\//);
    await openMembership(page, '901', 'E2E edit membership');
    await expect(page.getByRole('spinbutton', { name: 'Amount' }).first()).toHaveValue('250');
  });

  test('deletes a membership', async ({ page }) => {
    await openMembership(page, '902', 'E2E delete membership');
    await confirmed(page, /^delete( membership)?$/i, /^delete/i);
    await expect(page).toHaveURL(/\/member\//);
    await openPayment(page, '902');
    await expect(page.getByRole('link', { name: /connected membership/i })).not.toBeVisible();
  });
});

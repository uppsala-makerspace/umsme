import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, expectSearch, sortBy } from './lists';
import { field, action, createButton, saveButton, confirmed, deleteConfirmed, openTab } from './forms';

// Certificates: list, add, edit, what a certificate links to, its holders,
// revoking, marking one mandatory, delete, a member's certificates, and who
// sees them. Written against the Blaze pages and meant to pass against their
// replacement (see liability.spec.ts).

const KILN = 'Keramikugn';
const WHEEL = 'Drejskiva';

const rows = dataRows;

const openCertificate = async (page: Page, name: string) => {
  await openAs(page, 'admin', '/certificates');
  await page.getByText(name, { exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
};

test.describe('Certificates', () => {
  test('lists the certificates', async ({ page }) => {
    await openAs(page, 'admin', '/certificates');
    await expect(page.getByRole('heading', { name: /^certificates$/i, level: 1 })).toBeVisible();
    await expect(rows(page).filter({ hasText: KILN })).toBeVisible();
    await expect(rows(page).filter({ hasText: WHEEL })).toBeVisible();
  });

  test('the board sees them too', async ({ page }) => {
    await openAs(page, 'board', '/certificates');
    await expect(page.getByText(KILN, { exact: true })).toBeVisible();
  });

  test('the treasurer does not see them', async ({ page }) => {
    await openAs(page, 'treasurer', '/certificates');
    await expect(page.getByRole('heading', { name: /^certificates$/i, level: 1 })).toBeVisible();
    await expect(page.getByText(KILN, { exact: true })).not.toBeVisible();
  });

  test('searches and sorts the list', async ({ page }) => {
    await openAs(page, 'admin', '/certificates');
    await expect(page.getByText(KILN, { exact: true })).toBeVisible();
    await sortBy(page, 'Name', 'descending');
    await expect(rows(page).first()).toContainText(KILN);
    await expectSearch(page, 'ugn', KILN, WHEEL);
  });

  test('adds a certificate', async ({ page }) => {
    await openAs(page, 'admin', '/certificates');
    await action(page, /^add certificate$/i).click();
    await field(page, 'Name (Swedish)').fill('E2E nytt certifikat');
    await createButton(page).click();
    await expect(page.getByText('E2E nytt certifikat').first()).toBeVisible();
  });

  test('edits a certificate', async ({ page }) => {
    await openCertificate(page, 'E2E edit certificate');
    await field(page, 'Description (Swedish)').fill('Ett certifikat för test.');
    await page.getByRole('spinbutton', { name: 'Default validity (days)' }).fill('90');
    await saveButton(page).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/E2E edit certificate|^Certificates$/);

    await openCertificate(page, 'E2E edit certificate');
    await expect(field(page, 'Description (Swedish)')).toHaveValue('Ett certifikat för test.');
    await expect(page.getByRole('spinbutton', { name: 'Default validity (days)' })).toHaveValue('90');
  });

  test('shows its workshop, certifiers, prerequisites and holders', async ({ page }) => {
    await openCertificate(page, KILN);
    await expect(page.getByRole('link', { name: /Keramikverkstaden/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sara Styrgrupp' }).first()).toBeVisible();
    await openTab(page, /^holders \(\d+\)$/i);
    await expect(page.getByText('Maja Medlem').first()).toBeVisible();

    await openCertificate(page, WHEEL);
    await expect(page.getByRole('link', { name: KILN })).toBeVisible();
  });

  test('sets the workshop, a certifier and a prerequisite, on save', async ({ page }) => {
    await openCertificate(page, 'E2E links certificate');
    await page.getByRole('combobox', { name: 'Workshop or area of interest' }).selectOption({ label: 'Keramikverkstaden' });
    await page.getByRole('combobox', { name: 'Add to certifiers' }).fill('Sara Sty');
    await page.getByRole('listbox').getByRole('option', { name: /Sara Styrgrupp/ }).click();
    await page.getByRole('combobox', { name: 'Certificates needed first' }).fill('ugn');
    await page.getByRole('listbox').getByRole('option', { name: KILN }).click();
    await saveButton(page).click();
    await expect(page.getByText(/^saved\.?$/i)).toBeVisible();

    await openCertificate(page, 'E2E links certificate');
    await expect(page.getByRole('link', { name: 'Open Keramikverkstaden' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sara Styrgrupp/ })).toBeVisible();
    await expect(page.getByRole('link', { name: KILN, exact: true })).toBeVisible();
    await page.getByRole('img', { name: 'Remove Sara Styrgrupp' }).click();
    await saveButton(page).click();
    await expect(page.getByText(/^saved\.?$/i)).toBeVisible();
    await openCertificate(page, 'E2E links certificate');
    await expect(page.getByText(/no certifiers by name/i)).toBeVisible();
  });

  test('grants a certificate to a member', async ({ page }) => {
    await openCertificate(page, 'E2E grant certificate');
    await openTab(page, /^holders/i);
    await page.getByRole('combobox', { name: 'Member', exact: true }).fill('Nora');
    await page.getByRole('listbox').getByRole('option', { name: /Nora Ny/ }).click();
    await expect(page.getByRole('combobox', { name: 'Certified by' })).toHaveValue(/Astrid Admin/);
    await action(page, /^grant certificate$/i).click();
    await expect(rows(page).filter({ hasText: 'Nora Ny' })).toContainText('Astrid Admin');
  });

  test('grants a certificate on the member\'s page', async ({ page }) => {
    await openCertificate(page, KILN);
    await openTab(page, /^holders/i);
    await page.getByRole('link', { name: 'Maja Medlem' }).first().click();
    await page.getByRole('combobox', { name: 'Certificate', exact: true }).selectOption({ label: WHEEL });
    await action(page, /^grant certificate$/i).click();
    await expect(rows(page).filter({ hasText: WHEEL })).toBeVisible();
  });

  test('revokes a holder\'s certificate', async ({ page }) => {
    await openCertificate(page, 'E2E revoke certificate');
    await openTab(page, /^holders/i);
    const holder = rows(page).filter({ hasText: 'Bo Basmedlem' });
    await expect(holder).toBeVisible();
    page.once('dialog', (dialog) => dialog.accept());
    await holder.getByRole('button', { name: /^revoke$/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /^revoke$/i }).click({ timeout: 3000 }).catch(() => {});
    await expect(holder).toHaveCount(0);
  });

  test('marks a certificate mandatory, which keeps it', async ({ page }) => {
    await openCertificate(page, 'E2E mandatory certificate');
    await openTab(page, /^other$/i);
    await confirmed(page, /mark as mandatory/i, /^(mark as mandatory|mark|ok|confirm)/i);
    await expect(page.getByText(/mandatory for membership and cannot be deleted/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^delete/i })).not.toBeVisible();
  });

  test('deletes a certificate', async ({ page }) => {
    await openCertificate(page, 'E2E delete certificate');
    await deleteConfirmed(page);
    await expect(page.getByText(KILN, { exact: true })).toBeVisible();
    await expect(page.getByText('E2E delete certificate', { exact: true })).not.toBeVisible();
  });

  test('shows a member\'s certificates on their page', async ({ page }) => {
    await openCertificate(page, KILN);
    await openTab(page, /^holders/i);
    await page.getByRole('link', { name: 'Maja Medlem' }).first().click();
    await expect(page.getByRole('tab', { name: /^certificates/i, selected: true })).toBeVisible();
    await expect(page.getByRole('link', { name: KILN }).first()).toBeVisible();
  });
});

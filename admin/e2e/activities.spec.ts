import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import { dataRows, expectSearch, sortBy } from './lists';
import { field, action, saveButton, deleteConfirmed, openTab, confirmed } from './forms';

// Activities, their events, free-standing events and the categories, in admin.

const WHEEL = 'Drejintroduktion';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const rows = dataRows;
const inDays = (n: number) => {
  const d = new Date(Date.now() + n * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const openActivity = async (page: Page, name: string) => {
  await openAs(page, 'admin', '/activities');
  await page.getByText(name, { exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
};

test.describe('Activities', () => {
  test('lists them with group and category', async ({ page }) => {
    await openAs(page, 'admin', '/activities');
    await expect(page.getByRole('heading', { name: 'Activities', level: 1 })).toBeVisible();
    await expect(rows(page).filter({ hasText: WHEEL })).toContainText('Styrgrupp Keramik');
    await expect(rows(page).filter({ hasText: WHEEL })).toContainText('Kurs');
    await expect(rows(page).filter({ hasText: 'E2E delete aktivitet' })).toContainText('The association');
  });

  test('the treasurer does not see them', async ({ page }) => {
    await openAs(page, 'treasurer', '/activities');
    await expect(page.getByRole('heading', { name: 'Activities', level: 1 })).toBeVisible();
    await expect(page.getByText(WHEEL, { exact: true })).not.toBeVisible();
  });

  test('searches and sorts the list', async ({ page }) => {
    await openAs(page, 'admin', '/activities');
    await expect(page.getByText(WHEEL, { exact: true })).toBeVisible();
    await sortBy(page, 'Name', 'ascending');
    await expect(rows(page).first()).toContainText(WHEEL);
    await expectSearch(page, 'drej', WHEEL, 'E2E edit aktivitet');
  });

  test('adds an activity and shows its page', async ({ page }) => {
    await openAs(page, 'admin', '/activities');
    await action(page, /^add activity/i).click();
    await field(page, 'Name (Swedish)').fill('E2E ny aktivitet');
    await page.getByRole('combobox', { name: 'Owning group' }).selectOption({ label: 'Styrgrupp Keramik' });
    await action(page, /^add$/i).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E ny aktivitet');
  });

  test('edits an activity', async ({ page }) => {
    await openActivity(page, 'E2E edit aktivitet');
    await field(page, 'Description (Swedish, markdown)').fill('En aktivitet för test.');
    await page.getByRole('combobox', { name: 'Category' }).selectOption({ label: 'Kurs' });
    await page.getByRole('checkbox', { name: 'Shown on the website' }).check();
    await saveButton(page).click();
    await expect(page.getByText(/^saved\.?$/i)).toBeVisible();

    await openActivity(page, 'E2E edit aktivitet');
    await expect(field(page, 'Description (Swedish, markdown)')).toHaveValue('En aktivitet för test.');
    await expect(page.getByRole('combobox', { name: 'Category' }).locator('option:checked')).toHaveText('Kurs');
    await expect(page.getByText('On the website', { exact: true })).toBeVisible();
  });

  test('lists its events, the tab in the URL, and is not deleted while it has them', async ({ page }) => {
    await openActivity(page, WHEEL);
    await expect(page.getByText(/can not be deleted while it has events/i)).toBeVisible();
    await openTab(page, /^events \(3\)$/i);
    await expect(page).toHaveURL(/\?tab=events$/);
    await expect(rows(page).filter({ hasText: 'Cancelled' })).toHaveCount(1);
  });

  test('uploads and removes an image', async ({ page }) => {
    await openActivity(page, 'E2E image aktivitet');
    await openTab(page, /^image$/i);
    await page.locator('input[type="file"]').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: PNG });
    await action(page, /^upload image$/i).click();
    await expect(page.getByRole('img', { name: 'E2E image aktivitet' })).toBeVisible();
    await confirmed(page, /^remove image$/i);
    await expect(page.getByText(/no image uploaded/i)).toBeVisible();
  });

  test('deletes an activity', async ({ page }) => {
    await openActivity(page, 'E2E delete aktivitet');
    await deleteConfirmed(page);
    await expect(page.getByText(WHEEL, { exact: true })).toBeVisible();
    await expect(page.getByText('E2E delete aktivitet', { exact: true })).not.toBeVisible();
  });
});

test.describe('Events', () => {
  test('adds an event to an activity, which it takes its name and length from', async ({ page }) => {
    await openActivity(page, 'E2E events aktivitet');
    await openTab(page, /^events/i);
    await action(page, /^add event$/i).click();
    await expect(page.getByRole('combobox', { name: 'Activity' }).locator('option:checked')).toHaveText('E2E events aktivitet');
    await expect(field(page, 'Name (Swedish)')).toHaveAttribute('placeholder', 'E2E events aktivitet');
    await field(page, 'Day').fill(inDays(5));
    await field(page, 'Starts').fill('18:00');
    await action(page, /^add$/i).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`E2E events aktivitet, ${inDays(5)} 18:00`);
    await expect(field(page, 'Ends')).toHaveValue('19:30');
    await page.getByRole('link', { name: /the activity/i }).first().click();
    await expect(page.getByRole('tab', { name: /^events \(1\)$/i, selected: true })).toBeVisible();
  });

  test('cancels an event', async ({ page }) => {
    await openActivity(page, 'E2E cancel aktivitet');
    await openTab(page, /^events/i);
    await rows(page).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E cancel aktivitet');
    await page.getByRole('combobox', { name: 'Status' }).selectOption('cancelled');
    await saveButton(page).click();
    await expect(page.getByText(/^saved\.?$/i)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cancelled');
  });

  test('lists upcoming and past events', async ({ page }) => {
    await openAs(page, 'admin', '/events');
    await expect(rows(page).filter({ hasText: 'Årsmöte' })).toContainText('Free-standing');
    await openTab(page, /^past/i);
    await expect(page).toHaveURL(/\?tab=past$/);
    await expect(rows(page).filter({ hasText: WHEEL })).toHaveCount(1);
  });

  test('adds a free-standing event of the association', async ({ page }) => {
    await openAs(page, 'admin', '/events');
    await action(page, /^add free-standing event$/i).click();
    await field(page, 'Name (Swedish)').fill('E2E fritt event');
    await field(page, 'Day').fill(inDays(12));
    await field(page, 'Starts').fill('10');
    await field(page, 'Ends').fill('12:30');
    await action(page, /^add$/i).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`E2E fritt event, ${inDays(12)} 10:00`);
    await expect(page.getByRole('combobox', { name: 'Owning group' }).locator('option:checked')).toHaveText(/the association/i);
  });

  test('needs a name when free-standing', async ({ page }) => {
    await openAs(page, 'admin', '/events/add');
    await field(page, 'Day').fill(inDays(12));
    await field(page, 'Starts').fill('10:00');
    await field(page, 'Ends').fill('11:00');
    // The browser keeps an empty required field from being sent: no event is made.
    await action(page, /^add$/i).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Add event');
  });

  test('deletes an event', async ({ page }) => {
    await openAs(page, 'admin', '/events');
    await page.getByText('E2E delete event', { exact: true }).click();
    await deleteConfirmed(page);
    await expect(page.getByRole('heading', { name: 'Events', level: 1 })).toBeVisible();
    await expect(page.getByText('E2E delete event', { exact: true })).not.toBeVisible();
  });
});

test.describe('Activity categories', () => {
  test('lists them with their use', async ({ page }) => {
    await openAs(page, 'admin', '/activities/categories');
    await expect(rows(page).filter({ hasText: 'Kurs' })).toContainText('Course');
  });

  test('adds, changes and deletes a category', async ({ page }) => {
    await openAs(page, 'admin', '/activities/categories');
    await action(page, /^add category$/i).click();
    await page.getByRole('dialog').getByRole('textbox', { name: 'Name (Swedish)' }).fill('E2E ny kategori');
    await page.getByRole('dialog').getByRole('button', { name: /^add$/i }).click();
    await expect(rows(page).filter({ hasText: 'E2E ny kategori' })).toHaveCount(1);

    await rows(page).filter({ hasText: 'E2E edit category' }).click();
    await page.getByRole('dialog').getByRole('textbox', { name: 'Name (English)' }).fill('Edited');
    await page.getByRole('dialog').getByRole('button', { name: /^save$/i }).click();
    await expect(rows(page).filter({ hasText: 'E2E edit category' })).toContainText('Edited');

    await rows(page).filter({ hasText: 'E2E delete category' }).click();
    await page.getByRole('dialog').getByRole('button', { name: /^delete$/i }).click();
    await expect(rows(page).filter({ hasText: 'E2E delete category' })).toHaveCount(0);
  });

  test('keeps a category in use', async ({ page }) => {
    await openAs(page, 'admin', '/activities/categories');
    await rows(page).filter({ hasText: 'Kurs' }).click();
    await expect(page.getByRole('dialog').getByRole('button', { name: /^delete$/i })).toBeDisabled();
  });
});

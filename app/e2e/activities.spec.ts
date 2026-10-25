import { test, expect } from '@playwright/test';
import { openAs } from './helpers';
import en from '../imports/i18n/en.json';

// Activities and events in the app: every member sees them; the ceramics
// steering group's members (steering, groupLeader) add and change its
// activities and events, with hosts among the group's members.

// The app runs in English in the tests, so names are the English ones.
const WHEEL = 'Wheel introduction';
const CERAMICS = 'Ceramics steering group';
const inDays = (n: number) => {
  const d = new Date(Date.now() + n * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test.describe('Activities', () => {
  test('a member sees the events to come and the activities, and may change none', async ({ page }) => {
    await openAs(page, 'member', '/activities');
    await expect(page.getByRole('link', { name: /Årsmöte/ })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(WHEEL) }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: `+ ${en.eventNew}` })).toHaveCount(0);

    await page.getByRole('button', { name: en.activitiesAll }).click();
    await page.getByRole('link', { name: new RegExp(WHEEL) }).click();
    await expect(page.getByRole('heading', { name: WHEEL })).toBeVisible();
    await expect(page.getByRole('link', { name: CERAMICS, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: en.edit })).toHaveCount(0);
    await expect(page.getByRole('link', { name: `+ ${en.eventAdd}` })).toHaveCount(0);
  });

  test('a cancelled event is marked', async ({ page }) => {
    await openAs(page, 'member', '/activities');
    await expect(page.getByRole('link', { name: new RegExp(`${WHEEL}.*${en.eventCancelled}`) })).toBeVisible();
  });

  test('a member of the steering group adds an event, its hosts among the group', async ({ page }) => {
    await openAs(page, 'steering', '/activities');
    await page.getByRole('button', { name: en.activitiesAll }).click();
    await page.getByRole('link', { name: new RegExp(WHEEL) }).click();
    await page.getByRole('link', { name: `+ ${en.eventAdd}` }).click();
    await expect(page.getByRole('heading', { name: en.eventNew })).toBeVisible();
    await expect(page.getByLabel(en.activityFieldNameSv)).toHaveAttribute('placeholder', 'Drejintroduktion');
    await page.getByLabel(en.eventFieldDay).fill(inDays(6));
    await page.getByLabel(en.eventFieldStarts).fill('17:00');
    // Only the group's active members are offered as hosts.
    const hosts = page.locator('#event-hosts').getByRole('button');
    await expect(hosts).toHaveCount(2);
    await hosts.first().click();
    await page.getByRole('button', { name: en.save }).click();

    await expect(page.getByRole('heading', { name: WHEEL })).toBeVisible();
    await expect(page.getByText(/17:00–19:00/)).toBeVisible();
    await expect(page.getByText(en.eventOf.replace('{{name}}', WHEEL))).toBeVisible();
  });

  test('a member of the steering group adds a free-standing event of the group', async ({ page }) => {
    await openAs(page, 'groupLeader', '/events/new');
    await page.getByLabel(en.activityFieldGroup).selectOption({ label: CERAMICS });
    await page.getByLabel(en.activityFieldNameSv).fill('E2E drejkväll');
    await page.getByLabel(en.eventFieldDay).fill(inDays(8));
    await page.getByLabel(en.eventFieldStarts).fill('18:00');
    await page.getByLabel(en.eventFieldEnds).fill('21:00');
    await page.getByRole('button', { name: en.save }).click();
    await expect(page.getByRole('heading', { name: 'E2E drejkväll' })).toBeVisible();
    await expect(page.getByRole('link', { name: CERAMICS, exact: true })).toBeVisible();
  });

  test('a member of the steering group changes the activity', async ({ page }) => {
    await openAs(page, 'steering', '/activities');
    await page.getByRole('button', { name: en.activitiesAll }).click();
    await page.getByRole('link', { name: /E2E edit aktivitet/ }).click();
    await page.getByRole('link', { name: en.edit }).click();
    await page.getByLabel(en.activityFieldDescriptionSv).fill('Ändrad i appen.');
    await page.getByRole('button', { name: en.save }).click();
    await expect(page.getByText('Ändrad i appen.')).toBeVisible();
  });

  test('a member outside the group is sent back from the edit page', async ({ page }) => {
    await openAs(page, 'member', '/activities');
    await page.getByRole('button', { name: en.activitiesAll }).click();
    await page.getByRole('link', { name: new RegExp(WHEEL) }).click();
    const url = page.url();
    await page.goto(`${url}/edit`);
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('heading', { name: WHEEL })).toBeVisible();
  });
});

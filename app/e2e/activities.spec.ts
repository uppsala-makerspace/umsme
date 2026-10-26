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
    await expect(page.getByRole('link', { name: new RegExp(WHEEL) }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: `+ ${en.eventNew}` })).toHaveCount(0);

    await page.getByRole('button', { name: en.activitiesTabActivities }).click();
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
    await page.getByRole('button', { name: en.activitiesTabActivities }).click();
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
    await expect(page.getByRole('heading', { name: en.eventOf })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(WHEEL) })).toBeVisible();
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
    await page.getByRole('button', { name: en.activitiesTabActivities }).click();
    await page.getByRole('link', { name: /E2E edit aktivitet/ }).click();
    await page.getByRole('link', { name: en.edit }).click();
    await page.getByLabel(en.activityFieldDescriptionSv).fill('Ändrad i appen.');
    await page.getByRole('button', { name: en.save }).click();
    await expect(page.getByText('Ändrad i appen.')).toBeVisible();
  });

  test('a member outside the group is sent back from the edit page', async ({ page }) => {
    await openAs(page, 'member', '/activities');
    await page.getByRole('button', { name: en.activitiesTabActivities }).click();
    await page.getByRole('link', { name: new RegExp(WHEEL) }).click();
    const url = page.url();
    await page.goto(`${url}/edit`);
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('heading', { name: WHEEL })).toBeVisible();
  });

  test('the workshop shows its calendar and unfolds its activities; the group links to them', async ({ page }) => {
    await openAs(page, 'member', '/workshops');
    await page.getByRole('link', { name: /Ceramics workshop/ }).first().click();
    // Its calendar: the events to come, its activities folded away.
    await expect(page.getByRole('heading', { name: en.navCalendar })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(`${WHEEL}`) }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(`${WHEEL} \\d+ planned events?`) })).toHaveCount(0);
    await page.getByRole('button', { name: /^Show all activities/ }).click();
    // With the number of its planned events: other tests may add some.
    const activity = page.getByRole('link', { name: new RegExp(`${WHEEL} \\d+ planned events?`) });
    await expect(activity).toBeVisible();
    await page.getByRole('button', { name: en.workshopHideActivities }).click();
    await expect(activity).toHaveCount(0);
    await page.getByRole('button', { name: /^Show all activities/ }).click();
    await activity.click();
    await expect(page.getByRole('heading', { name: WHEEL })).toBeVisible();
    await page.getByRole('link', { name: CERAMICS, exact: true }).click();
    await expect(page.getByRole('link', { name: new RegExp(WHEEL) })).toBeVisible();
  });

  test('going back from an activity lands on the activities tab', async ({ page }) => {
    await openAs(page, 'member', '/activities');
    await page.getByRole('button', { name: en.activitiesTabActivities }).click();
    await page.getByRole('link', { name: new RegExp(WHEEL) }).click();
    await expect(page.getByRole('heading', { name: WHEEL })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\?tab=activities$/);
    await expect(page.getByRole('link', { name: /E2E historik/ })).toBeVisible();
  });

  test('lists past events, latest first, ten at a time', async ({ page }) => {
    // Someone who may add events: the button is there for those to come only.
    await openAs(page, 'steering', '/activities');
    await expect(page.getByRole('link', { name: `+ ${en.eventNew}` })).toBeVisible();
    await page.getByRole('combobox', { name: en.eventsWhen }).selectOption('past');
    await expect(page).toHaveURL(/\?when=past$/);
    await expect(page.getByRole('link', { name: `+ ${en.eventNew}` })).toHaveCount(0);
    const rows = page.getByRole('main').getByRole('listitem');
    await expect(rows).toHaveCount(10);
    // The wheel introduction ten days ago comes before the weekly ones from two weeks back.
    await expect(rows.nth(1)).toContainText(WHEEL);
    await page.getByRole('button', { name: en.eventsLoadMore }).click();
    // Twelve weekly ones, the wheel introduction and a free-standing one to take in (admin's test).
    await expect(rows).toHaveCount(14);
    await expect(page.getByRole('button', { name: en.eventsLoadMore })).toHaveCount(0);
  });

  test('a member of the steering group creates an activity from an activity group below it', async ({ page }) => {
    await openAs(page, 'steering', '/groups');
    await page.getByRole('link', { name: /Glazing group/ }).first().click();
    await expect(page.getByRole('heading', { name: en.activities })).toBeVisible();
    await page.getByRole('link', { name: `+ ${en.activityNew}` }).click();
    await expect(page.getByLabel(en.activityFieldGroup).locator('option:checked')).toHaveText('Glazing group');
    await page.getByLabel(en.activityFieldNameSv).fill('E2E glasyrkurs');
    await page.getByRole('button', { name: en.save }).click();
    await expect(page.getByRole('heading', { name: 'E2E glasyrkurs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Glazing group', exact: true })).toBeVisible();
  });

  test('a member of an activity group does not create its activities', async ({ page }) => {
    await openAs(page, 'discounted', '/groups');
    await page.getByRole('link', { name: /Glazing group/ }).first().click();
    await expect(page.getByRole('heading', { name: en.activities })).toBeVisible();
    await expect(page.getByRole('link', { name: `+ ${en.activityNew}` })).toHaveCount(0);
  });

  test('an activity may keep its events to those who may change it', async ({ page }) => {
    await openAs(page, 'discounted', '/activities?tab=activities');
    await page.getByRole('link', { name: /E2E open activity/ }).click();
    await expect(page.getByRole('link', { name: `+ ${en.eventAdd}` })).toBeVisible();
    await page.goBack();
    await page.getByRole('link', { name: /E2E kept activity/ }).click();
    await expect(page.getByRole('heading', { name: 'E2E kept activity' })).toBeVisible();
    await expect(page.getByRole('link', { name: `+ ${en.eventAdd}` })).toHaveCount(0);
  });

  test('the responsible books the events of an activity kept to its editors', async ({ page }) => {
    await openAs(page, 'groupLeader', '/activities?tab=activities');
    await page.getByRole('link', { name: /E2E kept activity/ }).click();
    await expect(page.getByRole('link', { name: `+ ${en.eventAdd}` })).toBeVisible();
    await page.getByRole('link', { name: en.edit }).click();
    await expect(page.getByLabel(en.activityFieldEventBookers).locator('option:checked')).toHaveText(en.activityEventBookersActivityEditors);
  });

  test('only those who may create activities see New event on the calendar', async ({ page }) => {
    // A member of a function group and an activity group, responsible for neither.
    await openAs(page, 'discounted', '/activities');
    await expect(page.getByRole('link', { name: new RegExp(WHEEL) }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: `+ ${en.eventNew}` })).toHaveCount(0);
  });

  test('a steering group member moves an activity only to their group or an activity group below it', async ({ page }) => {
    await openAs(page, 'steering', '/activities?tab=activities');
    await page.getByRole('link', { name: /E2E edit aktivitet/ }).click();
    await page.getByRole('link', { name: en.edit }).click();
    const owner = page.getByLabel(en.activityFieldGroup);
    await expect(owner.locator('option')).toHaveCount(2);
    expect((await owner.locator('option').allTextContents()).sort()).toEqual([CERAMICS, 'Glazing group'].sort());
  });

  test('a member of the steering group gives an activity an image, and a new event one of its own', async ({ page }) => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await openAs(page, 'steering', '/activities?tab=activities');
    await page.getByRole('link', { name: /E2E image aktivitet|E2E edit aktivitet/ }).first().click();
    await page.getByRole('link', { name: en.edit }).click();
    await page.locator('input[type="file"]').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('button', { name: en.removeImage })).toBeVisible();
    await page.getByRole('button', { name: en.removeImage }).click();
    await expect(page.getByText(en.imageNone)).toBeVisible();

    // A new event: the image waits until the event is created.
    await page.goto('/events/new');
    await page.getByLabel(en.activityFieldGroup).selectOption({ label: CERAMICS });
    await page.getByLabel(en.activityFieldNameSv).fill('E2E bildkväll');
    await page.getByLabel(en.eventFieldDay).fill(inDays(9));
    await page.getByLabel(en.eventFieldStarts).fill('18:00');
    await page.getByLabel(en.eventFieldEnds).fill('20:00');
    await page.locator('input[type="file"]').setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('button', { name: en.removeImage })).toBeVisible();
    await page.getByRole('button', { name: en.save }).click();
    await expect(page.getByRole('heading', { name: 'E2E bildkväll' })).toBeVisible();
    await expect(page.locator('main img').first()).toHaveAttribute('src', /\/api\/events\/.+\/image\?v=/);
  });

  test('one who may not create activities makes no free-standing event', async ({ page }) => {
    // Books events of the function group's open activity, creates no activities.
    await openAs(page, 'discounted', '/events/new');
    const activity = page.getByLabel(en.eventFieldActivity);
    await expect(activity.locator('option', { hasText: en.eventFieldFree })).toHaveCount(0);
    await expect(activity.locator('option:checked')).not.toHaveText('');
    await expect(page.getByLabel(en.activityFieldGroup)).toHaveCount(0);
  });

  test('one who may create activities may make a free-standing event', async ({ page }) => {
    await openAs(page, 'groupLeader', '/events/new');
    await expect(page.getByLabel(en.eventFieldActivity).locator('option', { hasText: en.eventFieldFree })).toHaveCount(1);
  });
});


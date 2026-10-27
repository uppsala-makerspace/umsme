import { test, expect, type Page } from '@playwright/test';
import { openAs, testUsers } from './helpers';
import en from '../imports/i18n/en.json';

// Signing up for events, the queue, one's own registrations, interest in an
// activity, and a host recording who came. One seeded event per test
// (scenarios/e2e.js); the app runs in English.

/** Open an event to come from the events tab, loading more until it shows. */
const openEvent = async (page: Page, persona: string, name: string) => {
  await openAs(page, persona, '/calendar');
  const link = page.getByRole('link', { name: new RegExp(name) }).first();
  const more = page.getByRole('button', { name: en.eventsLoadMore });
  await expect(link.or(more).first()).toBeVisible();
  while (!(await link.isVisible()) && (await more.isVisible())) {
    await more.click();
    await page.waitForTimeout(300);
  }
  await link.click();
  await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
};

test.describe('Registrations', () => {
  test('a member signs up, with the information asked for, and withdraws', async ({ page }) => {
    await openEvent(page, 'member', 'E2E sign-up');
    await expect(page.getByText('3 of 3 seats left')).toBeVisible();
    await page.getByLabel(en.registrationInfo).fill('Nötter');
    await page.getByRole('button', { name: en.registrationSignUp }).click();
    await expect(page.getByText(en.registrationState_approved, { exact: true })).toBeVisible();
    await expect(page.getByText('2 of 3 seats left')).toBeVisible();
    // The message about it leads back to the event.
    await page.goto('/messages');
    await page.getByRole('button', { name: /Personal messages/ }).click();
    await page.getByText(/You are registered: E2E sign-up/).first().click();
    await page.getByRole('link', { name: en.messageToEvent }).click();
    await expect(page.getByRole('heading', { name: 'E2E sign-up', level: 2 })).toBeVisible();
    await page.getByRole('button', { name: en.registrationWithdraw }).click();
    await expect(page.getByText(en.registrationState_withdrawn, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: en.registrationSignUp })).toBeVisible();
  });

  test('a member queues for a full event, and finds it among their registrations', async ({ page }) => {
    await openEvent(page, 'member', 'E2E full');
    await expect(page.getByText('0 of 1 seats left')).toBeVisible();
    await page.getByRole('button', { name: en.registrationJoinQueue }).click();
    await expect(page.getByText(en.registrationState_queued, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: en.registrationLeaveQueue })).toBeVisible();

    await page.goto('/calendar');
    await page.getByRole('combobox', { name: en.eventsWhen }).selectOption('mine');
    await expect(page.getByRole('link', { name: /E2E full/ })).toContainText(en.registrationState_queued);
  });

  test('a host records who came and closes the attendance', async ({ page }) => {
    await openEvent(page, 'groupLeader', 'E2E attendance');
    const came = testUsers.discounted.name as string;
    const stayed = testUsers.quarterly.name as string;
    const row = (name: string) => page.getByRole('listitem').filter({ hasText: name });
    await row(came).getByRole('button', { name: en.participantsCame }).click();
    await expect(row(came)).toContainText(en.registrationState_attended);
    await page.getByRole('button', { name: en.participantsCloseAttendance }).click();
    await expect(page.getByText(en.participantsAttendanceClosed)).toBeVisible();
    await expect(row(stayed)).toContainText(en.registrationState_noShow);
  });

  test('a host marks who came, adds one who came by number, and gives the certificate apart', async ({ page }) => {
    // E2E glazing course gives E2E glazing and takes optional registration; steering hosts it and certifies glazing.
    await openEvent(page, 'steering', 'E2E glazing course');
    await expect(page.getByRole('definition').filter({ hasText: 'E2E glazing' })).toBeVisible();
    const came = testUsers.discounted.name as string;
    const row = (name: string) => page.getByRole('listitem').filter({ hasText: name });
    await row(came).getByRole('button', { name: en.participantsCame }).click();
    await expect(row(came)).toContainText(en.registrationState_attended);
    // Coming gives no certificate; the host gives it, and the row links to it.
    const held = en.participantsCertificateLink.replace('{{name}}', 'E2E glazing');
    await expect(row(came).getByRole('link', { name: new RegExp(held) })).toHaveCount(0);
    await row(came).getByRole('button', { name: en.participantsGiveCertificate }).click();
    await expect(page.getByRole('status')).toHaveText(en.participantsCertificateGranted.replace('{{name}}', came));
    await expect(row(came).getByRole('link', { name: new RegExp(held) })).toBeVisible();
    await expect(row(came).getByRole('button', { name: en.participantsGiveCertificate })).toHaveCount(0);
    await expect(row(came).getByRole('button', { name: en.participantsUndo })).toBeVisible();

    // One who came without signing up, found by membership number.
    const added = testUsers.base;
    await page.getByRole('textbox', { name: en.participantsAddSearch }).fill(added.mid as string);
    await page.getByRole('button', { name: en.participantsAddSearch }).click();
    await row(added.name as string).getByRole('button', { name: en.participantsAddCame }).click();
    await expect(row(added.name as string)).toContainText(en.registrationState_attended);
  });

  test('board finds a member to add by name', async ({ page }) => {
    await openEvent(page, 'board', 'E2E glazing course');
    const wanted = testUsers.familyMember.name as string;
    await page.getByRole('textbox', { name: en.participantsAddSearch }).fill(wanted.split(' ')[0]);
    await page.getByRole('button', { name: en.participantsAddSearch }).click();
    await expect(page.getByRole('listitem').filter({ hasText: wanted }).getByRole('button', { name: en.participantsAddCame })).toBeVisible();
  });

  test('a host who is no board member finds nobody by name', async ({ page }) => {
    await openEvent(page, 'steering', 'E2E glazing course');
    await page.getByRole('textbox', { name: en.participantsAddSearch }).fill(testUsers.member.name as string);
    await page.getByRole('button', { name: en.participantsAddSearch }).click();
    await expect(page.getByText(en.participantsAddNone)).toBeVisible();
  });

  test('a host who may certify sees who has asked for the certificate, and goes to the request', async ({ page }) => {
    await openEvent(page, 'steering', 'E2E glazing talk');
    const asked = testUsers.quarterly.name as string;
    await page.getByRole('listitem').filter({ hasText: asked }).getByRole('link', { name: new RegExp(en.participantsAskedForCertificate) }).click();
    await expect(page).toHaveURL(/\/certifier-requests\//);
    await expect(page.getByText(asked).first()).toBeVisible();
  });

  test('a member who is no host sees no participants', async ({ page }) => {
    await openEvent(page, 'member', 'E2E attendance');
    await expect(page.getByRole('heading', { name: en.participants })).toHaveCount(0);
  });

  test('a member shows interest in an activity', async ({ page }) => {
    await openAs(page, 'member', '/activities');
    await page.getByRole('link', { name: /E2E open activity/ }).click();
    await page.getByRole('button', { name: en.activityInterest }).click();
    await expect(page.getByText(en.activityInterested)).toBeVisible();
    await page.getByRole('button', { name: en.activityNotInterested }).click();
    await expect(page.getByText(en.activityInterestQuestion)).toBeVisible();
  });

  test('an event asking for a certificate says so, and one without it cannot sign up', async ({ page }) => {
    await openEvent(page, 'member', 'E2E wheel follow-up');
    await expect(page.getByRole('term').filter({ hasText: en.activityFactCertificate })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Pottery wheel' }).first()).toBeVisible();
    await expect(page.getByText(en.registrationLacksCertificate)).toBeVisible();
    await expect(page.getByRole('button', { name: en.registrationSignUp })).toBeDisabled();
  });

  test('a paying member not yet accepted by the board may sign up', async ({ page }) => {
    // Not clicked: the seats of E2E sign-up are counted by the test above.
    await openEvent(page, 'pending', 'E2E sign-up');
    await page.getByLabel(en.registrationInfo).fill('Nötter');
    await expect(page.getByRole('button', { name: en.registrationSignUp })).toBeEnabled();
    await expect(page.getByText(en.registrationNotMember_noMembership)).toHaveCount(0);
  });

  test('a host of an event without registration is told there is none', async ({ page }) => {
    // The ceramics introduction's events take no registrations; groupLeader hosts them.
    await openEvent(page, 'groupLeader', 'Wheel introduction');
    await expect(page.getByText(en.participantsNoRegistration)).toBeVisible();
    await expect(page.getByText(en.participantsNone)).toHaveCount(0);
  });
});


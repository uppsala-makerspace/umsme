import { test, expect } from '@playwright/test';
import { testUsers, openAs, selectors, firstName } from './helpers';
import en from '../imports/i18n/en.json';

test.describe('Membership Status', () => {
  test('should display membership status on home page for active member', async ({ page }) => {
    // Login as member with active membership and liability
    await openAs(page, 'member');

    // Verify we're on the home page
    await expect(page).toHaveURL('/');

    // Verify user greeting with first name
    await expect(page.locator(selectors.homeGreeting)).toContainText(firstName(testUsers.member));

    // Since member has approved liability, they should see unlock and calendar buttons
    await expect(page.locator(selectors.homeUnlockLink)).toBeVisible();
    await expect(page.locator(selectors.homeCalendarLink)).toBeVisible();
  });

  test('should display membership details on account page', async ({ page }) => {
    // Login as member
    await openAs(page, 'member', '/account');

    // Verify member name is displayed
    await expect(page.locator(selectors.memberName)).toContainText(testUsers.member.name);

    // Verify member ID is displayed
    await expect(page.getByText(testUsers.member.mid!)).toBeVisible();

    // Verify membership type is displayed
    await expect(page.getByText(en.TypeOfMembership)).toBeVisible();

    // Verify membership end date is displayed
    await expect(page.getByText(en.MembershipEnd)).toBeVisible();

    // Verify days remaining is displayed (first match - there may be two: membership and lab)
    await expect(page.getByText(en.daysRemaining).first()).toBeVisible();
  });
});

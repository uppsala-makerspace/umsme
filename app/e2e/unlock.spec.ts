import { test, expect } from '@playwright/test';
import { openAs, selectors } from './helpers';
import en from '../imports/i18n/en.json';

test.describe('Unlock Page', () => {
  test('should show liability message on unlock page when liability not approved', async ({ page }) => {
    // Login as member without liability approval (using noliability2 to avoid conflict with liability approval test)
    await openAs(page, 'noliability2', '/unlock');

    // Should show liability message
    await expect(page.getByText(en.homeLiabilityNotApproved)).toBeVisible();

    // Should show button to go to liability page (scoped to main to avoid matching a nav link)
    await expect(page.locator(selectors.liabilityLink)).toBeVisible();
    await expect(page.getByText(en.homeLiabilityButton)).toBeVisible();

    // Door buttons should NOT be visible
    await expect(page.locator(selectors.doorButton)).not.toBeVisible();
  });

  test('should show door buttons on unlock page when liability is approved', async ({ page }) => {
    // Login as member with approved liability
    await openAs(page, 'member', '/unlock');

    // Door buttons should be visible
    await expect(page.locator(selectors.doorButton).first()).toBeVisible();

    // Should see door labels
    await expect(page.locator(selectors.doorLabel).first()).toBeVisible();

    // Should see door button with "Öppna" (Open) text
    await expect(page.locator(selectors.doorButton).first()).toBeVisible();

    // Liability message should NOT be visible
    await expect(page.getByText(en.homeLiabilityNotApproved)).not.toBeVisible();
  });

  test('should navigate from home to unlock page via button', async ({ page }) => {
    // Login as member with approved liability
    await openAs(page, 'member');

    // Should see unlock link on home page
    await expect(page.locator(selectors.homeUnlockLink)).toBeVisible();

    // Click the unlock link
    await page.locator(selectors.homeUnlockLink).click();

    // Wait for navigation
    await page.waitForURL('/unlock');

    // Verify we're on unlock page with door buttons
    await expect(page.locator(selectors.doorButton).first()).toBeVisible();
  });
});

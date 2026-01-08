import { test, expect } from '@playwright/test';
import { testUsers, login, selectors, setLanguageEnglish } from './helpers';

test.describe('Authentication', () => {
  test('should sign in with email and password and land on home page', async ({ page }) => {
    // Set language to English
    await setLanguageEnglish(page);

    // Navigate to login page
    await page.goto('/login');

    // Verify we're on the login page
    await expect(page.locator('img[alt="UM Logo"]')).toBeVisible();
    await expect(page.locator(selectors.loginEmailInput)).toBeVisible();

    // Fill in credentials
    await page.locator(selectors.loginEmailInput).fill(testUsers.member.email);
    await page.locator(selectors.loginPasswordInput).fill(testUsers.member.password);

    // Click login button
    await page.locator(selectors.loginButton).click();

    // Wait for redirect to home page
    await page.waitForURL('/');

    // Verify we're on the home page with the user's name displayed
    await expect(page.locator(selectors.homeGreeting)).toContainText('Test');
  });

  test('should redirect unverified user to email verification page', async ({ page }) => {
    // Set language to English
    await setLanguageEnglish(page);

    // Navigate to login page
    await page.goto('/login');

    // Fill in credentials for unverified user
    await page.locator(selectors.loginEmailInput).fill(testUsers.unverified.email);
    await page.locator(selectors.loginPasswordInput).fill(testUsers.unverified.password);

    // Click login button
    await page.locator(selectors.loginButton).click();

    // Should be redirected to email verification page
    await page.waitForURL(/waitForEmailVerification/i);

    // Verify we're on the verification page
    await expect(page.locator(selectors.verificationPage)).toBeVisible();

    // Verify the send verification button is visible
    await expect(page.locator(selectors.sendVerificationButton)).toBeVisible();
  });
});

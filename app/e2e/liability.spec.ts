import { test, expect } from '@playwright/test';
import { testUsers, login, selectors } from './helpers';
import en from '../imports/i18n/en.json';

test.describe('Liability Agreement', () => {
  test('should show liability agreement page and allow approval', async ({ page }) => {
    // Login as member without liability (noliability@test.com)
    await login(page, testUsers.noliability.email, testUsers.noliability.password);

    // On home page, should see liability message since user hasn't approved
    await expect(page.getByText(en.homeLiabilityNotApproved)).toBeVisible();

    // Click the button to go to liability page
    await page.locator(selectors.homeLiabilityButton).click();

    // Wait for navigation to liability page
    await page.waitForURL('/liability');

    // Verify liability page elements (use heading role, first match)
    await expect(page.getByRole('heading', { name: en.liabilityTitle }).first()).toBeVisible();

    // Should show blue banner indicating not approved
    await expect(page.locator(selectors.liabilityStatusBlue)).toBeVisible();
    await expect(page.getByText(en.liabilityNotApproved)).toBeVisible();

    // Verify checkbox is visible and unchecked
    const checkbox = page.locator(selectors.liabilityCheckbox);
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();

    // Verify approve button is disabled when checkbox is unchecked
    const approveButton = page.getByRole('button', { name: en.liabilityApproveButton });
    await expect(approveButton).toBeDisabled();

    // Check the checkbox
    await checkbox.check();

    // Verify approve button is now enabled
    await expect(approveButton).toBeEnabled();

    // Click approve button
    await approveButton.click();

    // Wait for approval to be processed
    await page.waitForTimeout(1000);

    // Should now show green banner indicating approved
    await expect(page.locator(selectors.liabilityStatusGreen)).toBeVisible();
    await expect(page.getByText(en.liabilityApproved)).toBeVisible();

    // Checkbox and approve button should no longer be visible
    await expect(checkbox).not.toBeVisible();
  });

  test('should show approved status for member with approved liability', async ({ page }) => {
    // Login as member with approved liability
    await login(page, testUsers.member.email, testUsers.member.password);

    // Navigate directly to liability page
    await page.goto('/liability');

    // Should show green banner indicating approved
    await expect(page.locator(selectors.liabilityStatusGreen)).toBeVisible();
    await expect(page.getByText(en.liabilityApproved)).toBeVisible();

    // Checkbox should not be visible since already approved
    await expect(page.locator(selectors.liabilityCheckbox)).not.toBeVisible();
  });
});

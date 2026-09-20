import { test, expect } from '@playwright/test';
import { login, testUsers } from './helpers';
import en from '../imports/i18n/en.json';
import sv from '../imports/i18n/sv.json';

test.describe.serial('Member storage', () => {
  test('creates, updates, and cancels an allocation request from authoritative state', async ({ page }) => {
    await login(page, testUsers.member.email, testUsers.member.password);
    await page.goto('/storage');

    await expect(page.getByTestId('storage-none')).toHaveText(en.noBoxAssigned);
    await page.getByLabel(en.storagePreferredFloor).selectOption('floor2');
    await page.getByRole('button', { name: en.queueForBox }).click();

    const requestCard = page.getByTestId('storage-request-allocation');
    await expect(requestCard).toBeVisible();
    await expect(requestCard.getByText(en.storageFloor2, { exact: true })).toBeVisible();
    await page.getByLabel(en.storagePreferredHeight).selectOption('high');
    await page.getByRole('button', { name: en.storageUpdateRequest }).click();
    await expect(page.getByText(`${en.storageFloor2}, ${en.storageHeightHigh}`, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: en.storageCancelRequest }).click();
    await expect(page.getByTestId('storage-none')).toHaveText(en.noBoxAssigned);
  });

  test('shows a paying family member its assigned unit and available actions', async ({ page }) => {
    await login(page, testUsers.familyPayer.email, testUsers.familyPayer.password);
    await page.goto('/storage');

    await expect(page.getByTestId('storage-occupied')).toContainText('1001');
    const releaseButton = page.getByRole('button', { name: en.storageRequestRelease });
    await expect(releaseButton).toBeVisible();
    await releaseButton.click();
    const confirmation = page.getByTestId('storage-release-confirm');
    await expect(confirmation).toContainText(en.storageReleaseConfirm);
    await confirmation.getByRole('button', { name: en.cancel }).click();
    await expect(confirmation).not.toBeVisible();
    await expect(page.getByTestId('storage-occupied')).toContainText('1001');
    await expect(page.getByTestId('storage-family-read-only')).not.toBeVisible();
  });

  test('shows an expired occupant their open warning and deadline', async ({ page }) => {
    await login(page, testUsers.storageWarning.email, testUsers.storageWarning.password);
    await page.goto('/storage');

    await expect(page.getByTestId('storage-occupied')).toContainText('1002');
    await expect(page.getByTestId('storage-warning')).toContainText(en.storageWarningTitle);
    await expect(page.getByTestId('storage-warning')).toContainText('deadline');
    // Release remains available after lab membership expires.
    await expect(page.getByRole('button', { name: en.storageRequestRelease })).toBeVisible();
    await expect(page.getByRole('button', { name: en.storageRequestMove })).not.toBeVisible();
  });

  test('shows reclaimed storage as awaiting physical clearance', async ({ page }) => {
    await login(page, testUsers.storageClearance.email, testUsers.storageClearance.password);
    await page.goto('/storage');

    await expect(page.getByTestId('storage-awaiting-clearance')).toContainText('1003');
    await expect(page.getByRole('button', { name: en.queueForBox })).not.toBeVisible();
  });

  test('confirms a pending move and refetches the resulting assignment', async ({ page }) => {
    await login(page, testUsers.storageMove.email, testUsers.storageMove.password);
    await page.goto('/storage');

    await expect(page.getByTestId('storage-occupied')).toContainText('1004');
    await expect(page.getByTestId('storage-move-pending')).toContainText('1005');
    await page.getByRole('button', { name: en.storageConfirmMove }).click();

    await expect(page.getByTestId('storage-occupied')).toContainText('1005');
    await expect(page.getByTestId('storage-move-pending')).not.toBeVisible();
    await expect(page.getByRole('button', { name: en.storageConfirmMove })).not.toBeVisible();
  });

  test('shows a mutation error, refetches, and retries with the stable submission id', async ({ page }) => {
    await login(page, testUsers.storageRetry.email, testUsers.storageRetry.password);
    await page.goto('/storage');
    await expect(page.getByTestId('storage-none')).toBeVisible();

    await page.evaluate(() => {
      const meteor = (window as any).Meteor;
      const original = meteor.callAsync.bind(meteor);
      (window as any).__storageCommandIds = [];
      (window as any).__storageStateRefetches = 0;
      let failNextUpsert = true;
      meteor.callAsync = async (name: string, ...args: any[]) => {
        if (name === 'storage.member.getState') (window as any).__storageStateRefetches += 1;
        if (name === 'storage.member.upsertRequest') {
          (window as any).__storageCommandIds.push(args[0]?.command_id);
          if (failNextUpsert) {
            failNextUpsert = false;
            const error: any = new Error('simulated conflict');
            error.error = 'conflict';
            throw error;
          }
        }
        return original(name, ...args);
      };
    });

    await page.getByRole('button', { name: en.queueForBox }).click();
    await expect(page.getByRole('alert')).toHaveText(en.storageErrorConflict);
    await expect(page.getByTestId('storage-none')).toBeVisible();
    expect(await page.evaluate(() => (window as any).__storageStateRefetches)).toBeGreaterThan(0);

    await page.getByRole('button', { name: en.queueForBox }).click();
    await expect(page.getByTestId('storage-request-allocation')).toBeVisible();
    await expect(page.getByRole('alert')).not.toBeVisible();
    const ids = await page.evaluate(() => (window as any).__storageCommandIds);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBeTruthy();
    // The retry is the same user intent, so it must reuse the opaque id even
    // though the authoritative state was fetched between attempts.
    expect(ids[0]).toBe(ids[1]);
    await page.getByRole('button', { name: en.storageCancelRequest }).click();
    await expect(page.getByTestId('storage-none')).toBeVisible();
  });

  test('shows shared storage read-only to a family dependent in Swedish', async ({ page }) => {
    await login(page, testUsers.storageDependent.email, testUsers.storageDependent.password);
    await page.goto('/storage');
    await page.getByRole('button', { name: /SV\s*ENG/ }).click();

    await expect(page.getByTestId('storage-family-read-only')).toContainText('Familjens gemensamma förvaring');
    await expect(page.getByTestId('storage-occupied')).toContainText('1001');
    await expect(page.getByRole('button', { name: sv.storageRequestRelease })).not.toBeVisible();
  });
});

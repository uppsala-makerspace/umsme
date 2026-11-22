import { test, expect } from '@playwright/test';
import { openAs } from './helpers';
import en from '../imports/i18n/en.json';

// The RFID tag in the profile: written as 03-D7-3B-99 while it is typed or
// pasted, and stored so.
test.describe('RFID tag', () => {
  test('is written with dashes as it is typed, and saved so', async ({ page }) => {
    await openAs(page, 'rfidOwner', '/profile');
    const tag = page.getByLabel(en.rfid);
    await tag.pressSequentially('03d73');
    await expect(tag).toHaveValue('03-D7-3');
    await tag.fill('03:d7:3b:99');
    await expect(tag).toHaveValue('03-D7-3B-99');
    await expect(page.getByText(en.rfidFormatHint)).toBeVisible();
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForURL((url) => url.pathname === '/');
    await page.goto('/profile');
    await expect(page.getByLabel(en.rfid)).toHaveValue('03-D7-3B-99');
  });
});

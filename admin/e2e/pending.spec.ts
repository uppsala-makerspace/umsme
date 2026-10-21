import { test, expect } from '@playwright/test';
import { openAs } from './helpers';

// The members waiting for the board, and accepting one. Written against the
// React page (its Blaze version went with MemberStatus in the members move).

const card = (page, name: string) => page.getByRole('article', { name });

test.describe('Pending members', () => {
  test('lists the members waiting to be accepted', async ({ page }) => {
    await openAs(page, 'admin', '/pending');
    await expect(page.getByRole('heading', { name: /^pending members$/i, level: 1 })).toBeVisible();
    await expect(card(page, 'Petra Väntande')).toContainText(/total paid/i);
    await expect(card(page, 'Maja Medlem')).toHaveCount(0);
  });

  test('accepts a member', async ({ page }) => {
    await openAs(page, 'admin', '/pending');
    await card(page, 'E2E pending member').getByRole('button', { name: /^accept member$/i }).click();
    await expect(page.getByText(/E2E pending member is accepted/i)).toBeVisible();
    await expect(card(page, 'E2E pending member')).toHaveCount(0);
  });
});

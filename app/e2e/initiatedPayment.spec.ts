import { test, expect } from '@playwright/test';
import { openAs } from './helpers';
import en from '../imports/i18n/en.json';

// The payment page after a Swish payment says what was paid for: the item of
// the webshop, or the membership. Fixtures: E2EPURCHASEPAID and
// E2EMEMBERSHIPPAID in the e2e seed, both paid by the persona member.
const fill = (text: string, values: Record<string, string>) =>
  Object.entries(values).reduce((s, [k, v]) => s.replace(`{{${k}}}`, v), text);

test.describe('Payment page', () => {
  test('a webshop purchase names the item, amount and comment', async ({ page }) => {
    await openAs(page, 'member', '/initiatedPayment/E2EPURCHASEPAID');

    await expect(page.getByText(en.paymentApproved)).toBeVisible();
    await expect(page.getByText(fill(en.purchaseApproved, { item: 'Clay, 10 kg', amount: '150' }))).toBeVisible();
    await expect(page.getByText(fill(en.purchaseComment, { comment: 'Till drejkursen' }))).toBeVisible();
    await expect(page.getByText(en.MembershipRegistered)).toHaveCount(0);

    await page.getByRole('button', { name: en.storeMyPurchases }).click();
    await expect(page).toHaveURL('/purchases');
  });

  test('a membership payment still tells about the membership', async ({ page }) => {
    await openAs(page, 'member', '/initiatedPayment/E2EMEMBERSHIPPAID');

    await expect(page.getByText(en.paymentApproved)).toBeVisible();
    await expect(page.getByText(en.MembershipRegistered)).toBeVisible();
    await expect(page.getByRole('button', { name: en.storeMyPurchases })).toHaveCount(0);
  });
});

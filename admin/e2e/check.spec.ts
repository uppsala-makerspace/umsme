import { test, expect, type Page } from '@playwright/test';
import { testUsers } from './helpers';

// The public status pages: a member finds their status page by email and
// member number, and the page tells what their membership covers. No login.
// The status page lives where settings.public.checkPath says (the app, in
// the e2e settings), so the jump there is caught rather than followed.
// Written against the Blaze pages and meant to pass against their
// replacement (see liability.spec.ts).

const maja = testUsers.member;

/** Fill in the status page form and give the member id it leads to. */
const findStatusPage = async (page: Page, email: string, mid: string) => {
  await page.route(/:3101\//, (route) => route.fulfill({ body: 'status page' }));
  await page.goto('/check');
  const form = page.locator('form').filter({ hasText: /check your status page/i });
  await form.getByRole('textbox').fill(email);
  await form.getByRole('spinbutton').fill(mid);
  await form.getByRole('button', { name: /go to status page/i }).click();
  await page.waitForURL(/:3101\//);
  return page.url();
};

test.describe('Membership status', () => {
  test('finds a member\'s status page and shows it', async ({ page }) => {
    const target = await findStatusPage(page, maja.email, maja.mid!);
    const id = target.split(/[#/]/).pop();
    expect(id).toMatch(/^[A-Za-z0-9]{10,}$/);

    await page.goto(`/check/${id}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Maja Medlem');
    await expect(page.getByText(maja.mid!, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^member$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^lab access$/i })).toBeVisible();
  });

  test('tells when a link leads to no member', async ({ page }) => {
    await page.goto('/check/nosuchmember');
    await expect(page.getByRole('heading', { name: /no member with this id/i })).toBeVisible();
  });
});

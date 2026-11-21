import { test, expect, type Page } from '@playwright/test';
import { openAs } from './helpers';
import en from '../imports/i18n/en.json';

// The groups list: each group's categories beside its member count, and the
// filter section under the search box: a dropdown of checkboxes for the types
// and one for the categories, a green dot on the filter button when the filter
// is not the standard one, and a button to clear it.

const PREMISES = 'Premises group';
const GLAZING = 'Glazing group';

const filterButton = (page: Page) => page.getByRole('button', { name: /^Filter groups/ });
const dropdown = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test.describe('Groups list', () => {
  test('shows a group\'s categories and filters by them', async ({ page }) => {
    await openAs(page, 'member', '/groups');
    const premises = page.getByRole('link', { name: new RegExp(PREMISES) });
    await expect(premises).toContainText('Premises');
    await expect(page.getByRole('link', { name: new RegExp(GLAZING) })).toBeVisible();

    await expect(filterButton(page)).toHaveAttribute('aria-label', en.groupFilter);
    await filterButton(page).click();
    await expect(dropdown(page, en.filterCategories)).toContainText(en.filterAll);
    await dropdown(page, en.filterCategories).click();
    await page.getByRole('checkbox', { name: 'Premises' }).check();
    await expect(dropdown(page, en.filterCategories)).toContainText('Premises');
    await expect(premises).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(GLAZING) })).toHaveCount(0);
    await expect(filterButton(page)).toHaveAttribute('aria-label', en.groupFilterActive);

    await page.getByRole('button', { name: en.filterClear }).click();
    await expect(page.getByRole('link', { name: new RegExp(GLAZING) })).toBeVisible();
    await expect(filterButton(page)).toHaveAttribute('aria-label', en.groupFilter);
    await expect(page.getByRole('button', { name: en.filterClear })).toHaveCount(0);
  });

  test('filters by type, marked when off the standard', async ({ page }) => {
    await openAs(page, 'member', '/groups');
    await filterButton(page).click();
    await dropdown(page, en.groupFilterTypes).click();
    await page.getByRole('checkbox', { name: en.groupTypeResponsibility }).uncheck();
    await expect(page.getByRole('link', { name: new RegExp(GLAZING) })).toHaveCount(0);
    await expect(page.getByRole('link', { name: new RegExp(PREMISES) })).toBeVisible();
    await expect(filterButton(page)).toHaveAttribute('aria-label', en.groupFilterActive);
    // Back on the standard, no mark.
    await page.getByRole('checkbox', { name: en.groupTypeResponsibility }).check();
    await expect(filterButton(page)).toHaveAttribute('aria-label', en.groupFilter);
  });

  test('says which groups look for members and which are full', async ({ page }) => {
    await openAs(page, 'member', '/groups');
    await expect(page.getByRole('link', { name: new RegExp(PREMISES) })).toContainText(en.groupSeekingBadge);
    await expect(page.getByRole('link', { name: new RegExp(GLAZING) })).toContainText(en.groupFullBadge);
    await page.getByRole('link', { name: new RegExp(PREMISES) }).click();
    await expect(page.getByText(en.groupSeeking)).toBeVisible();
  });

  test('the workshop page says it too', async ({ page }) => {
    await openAs(page, 'member', '/workshops');
    await page.getByRole('link', { name: /Ceramics workshop/ }).first().click();
    const glazing = page.getByRole('listitem').filter({ hasText: GLAZING }).filter({ hasText: /\d+ members?/ });
    await expect(glazing).toContainText(en.groupFullBadge);
  });

  test('the group responsible sets the member limits', async ({ page }) => {
    await openAs(page, 'groupLeader', '/groups');
    await page.getByRole('link', { name: /E2E requests group/ }).click();
    await page.getByRole('link', { name: en.edit }).click();
    await page.getByLabel(en.groupMinMembers).fill('5');
    await page.getByRole('button', { name: en.save }).click();
    await expect(page.getByText(en.groupSeeking)).toBeVisible();
  });

});

// The admin role edits every group, workshop and area of interest without
// being in it; board does not.
test.describe('Editing as admin', () => {
  test('admin edits a group she is not in', async ({ page }) => {
    await openAs(page, 'admin', '/groups');
    await page.getByRole('link', { name: new RegExp(GLAZING) }).click();
    await page.getByRole('link', { name: en.edit }).click();
    await page.getByLabel(en.descriptionEn).fill('Glazes, edited by admin.');
    await page.getByRole('button', { name: en.save }).click();
    await expect(page.getByText('Glazes, edited by admin.')).toBeVisible();
  });

  test('admin edits a workshop whose group she is not in', async ({ page }) => {
    await openAs(page, 'admin', '/workshops');
    await page.getByRole('link', { name: /Ceramics workshop/ }).first().click();
    await page.getByRole('link', { name: en.edit }).click();
    await expect(page.getByLabel(en.descriptionSv)).toBeVisible();
  });

  test('board, in the group but not its responsible, does not', async ({ page }) => {
    await openAs(page, 'board', '/groups');
    await page.getByRole('link', { name: new RegExp(PREMISES) }).click();
    await expect(page.getByText(en.groupSeeking)).toBeVisible();
    await expect(page.getByRole('link', { name: en.edit, exact: true })).toHaveCount(0);
  });
});

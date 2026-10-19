import { expect, type Page } from '@playwright/test';

/**
 * Lists in admin: what every list test needs, whatever draws the list (a
 * table or MUI's DataGrid).
 */

/** The data rows, header rows left out. */
export const dataRows = (page: Page) => page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });

/** Type in the list's search box. */
export const search = (page: Page, text: string) => page.getByRole('searchbox').fill(text);

/** Sort by a column, as clicking its heading does. */
export const sortBy = (page: Page, column: string) =>
  page.getByRole('columnheader', { name: column, exact: true }).click();

/** The search finds `found` and filters out `filtered`. */
export const expectSearch = async (page: Page, text: string, found: string, filtered: string) => {
  await search(page, text);
  await expect(dataRows(page).filter({ hasText: found })).toHaveCount(1);
  await expect(dataRows(page).filter({ hasText: filtered })).toHaveCount(0);
};

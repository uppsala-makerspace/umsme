import { expect, type Page } from '@playwright/test';

/**
 * Lists in admin: what every list test needs, whatever draws the list (a
 * table or MUI's DataGrid).
 */

/** The data rows, header rows left out. */
export const dataRows = (page: Page) => page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });

/** Type in the list's search box. */
export const search = (page: Page, text: string) => page.getByRole('searchbox').fill(text);

/**
 * Sort by a column, clicking its heading until it says so (aria-sort), since
 * a list may already be sorted by it. The name is matched at the start:
 * DataTables adds ": Activate to sort" to it.
 */
export const sortBy = async (page: Page, column: string, direction: 'ascending' | 'descending' = 'ascending') => {
  const header = page.getByRole('columnheader', { name: new RegExp(`^${column}\\b`) }).first();
  for (let clicks = 0; clicks < 3 && (await header.getAttribute('aria-sort')) !== direction; clicks += 1) {
    await header.click();
  }
  await expect(header).toHaveAttribute('aria-sort', direction);
};

/** The search finds `found` and filters out `filtered`. */
export const expectSearch = async (page: Page, text: string, found: string, filtered: string) => {
  await search(page, text);
  await expect(dataRows(page).filter({ hasText: found })).toHaveCount(1);
  await expect(dataRows(page).filter({ hasText: filtered })).toHaveCount(0);
};

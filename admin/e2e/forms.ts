import { type Page } from '@playwright/test';

/**
 * Forms in admin, whatever draws them (AutoForm on Blaze, MUI on React).
 */

/**
 * A text field by its accessible name, as a screen reader announces it. Not
 * getByLabel: that reads the label's text, which with MUI includes the
 * required-field asterisk.
 */
export const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });

/** A button, or a link styled as one, by its name. */
export const action = (page: Page, name: RegExp) =>
  page.getByRole('button', { name }).or(page.getByRole('link', { name })).or(page.getByText(name)).first();

/** The button that saves a new item. */
export const createButton = (page: Page) => action(page, /^(submit|save|create|add)$/i);

/** The button that saves changes to an item. */
export const saveButton = (page: Page) => action(page, /update|save/i);

/**
 * Delete, confirming however the page asks: the browser's confirm() (Blaze)
 * or a dialog on the page (React).
 */
export const deleteConfirmed = async (page: Page) => {
  page.once('dialog', (dialog) => dialog.accept());
  await action(page, /^delete$/i).click();
  await page.getByRole('dialog').getByRole('button', { name: /^delete$/i }).click({ timeout: 3000 }).catch(() => {});
};

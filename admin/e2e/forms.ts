import { expect, type Page } from '@playwright/test';

/**
 * Forms in admin, whatever draws them (AutoForm on Blaze, MUI on React).
 */

/**
 * A text field by its accessible name, as a screen reader announces it. Not
 * getByLabel: that reads the label's text, which with MUI includes the
 * required-field asterisk.
 */
export const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });

/**
 * A button, or a link styled as one, by its name. Also an <a> without href,
 * which some Blaze pages use as a button (it has no link role).
 */
export const action = (page: Page, name: RegExp) =>
  page.getByRole('button', { name })
    .or(page.getByRole('link', { name }))
    .or(page.locator('a:not([href])').filter({ hasText: name }))
    .first();

/** The button that saves a new item. */
export const createButton = (page: Page) => action(page, /^(submit|save|create|add)$/i);

/** The button that saves changes to an item. */
export const saveButton = (page: Page) => action(page, /update|save/i);

/** A number field by its accessible name (the start of it, if a RegExp). */
export const numberField = (page: Page, name: string | RegExp) => page.getByRole('spinbutton', { name, exact: typeof name === 'string' });

/**
 * Click an action and confirm it however the page asks: the browser's
 * confirm() (Blaze) or a dialog on the page (React), whose confirming button
 * matches `confirm`.
 */
export const confirmed = async (page: Page, name: RegExp, confirm: RegExp = name) => {
  page.once('dialog', (dialog) => dialog.accept());
  await action(page, name).click();
  await page.getByRole('dialog').getByRole('button', { name: confirm }).click({ timeout: 3000 }).catch(() => {});
};

/** Delete, confirming: "Delete", or "Delete store item" and the like. */
export const deleteConfirmed = (page: Page) => confirmed(page, /^delete\b/i);

/** Open a tab of the page, by the start of its name ("Messages (3)" by /^messages/i). */
export const openTab = async (page: Page, name: RegExp) => {
  await page.getByRole('tab', { name }).click();
  await expect(page.getByRole('tab', { name, selected: true })).toBeVisible();
};

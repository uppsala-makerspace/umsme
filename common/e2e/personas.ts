/**
 * What the e2e tests of admin and the app share: the seeded personas as test
 * users, and opening a page as one of them.
 *
 * Read by Playwright only; no Meteor code imports this file.
 */
import type { Page } from '@playwright/test';
import { PERSONAS, E2E_PERSONAS, PASSWORD, e2eLoginToken } from '../server/seed/scenarios/personas.js';

export type TestUser = { email: string; password: string; name: string | null; mid?: string };

/**
 * Test users: the seeded personas, by key (member, family, admin, board,
 * storageWarning, …). See common/server/seed/scenarios/personas.js.
 */
export const testUsers: Record<string, TestUser> = Object.fromEntries(
  [...PERSONAS, ...E2E_PERSONAS].map((persona) => [
    persona.key,
    { email: persona.email, password: PASSWORD, name: persona.name, mid: persona.mid },
  ]),
);

/**
 * Open a page as a persona, already logged in: the e2e scenario gives every
 * persona a known login token, which goes into localStorage before the page
 * loads. No login page, no extra page load. The app's language is English.
 *
 * Use the login page itself only in tests about logging in.
 */
export async function openAs(page: Page, key: string, path = '/'): Promise<void> {
  if (!testUsers[key]) throw new Error(`No persona "${key}"`);
  await page.addInitScript((loginToken) => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('Meteor.loginToken', loginToken);
  }, e2eLoginToken(key));
  await page.goto(path);
}

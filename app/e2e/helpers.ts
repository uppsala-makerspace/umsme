import { Page, expect } from '@playwright/test';
import en from '../imports/i18n/en.json';
import { PERSONAS, E2E_PERSONAS, PASSWORD, e2eLoginToken } from '../imports/common/server/seed/scenarios/personas.js';

/**
 * Set the app language to English
 * Must be called before navigating to any page
 */
export async function setLanguageEnglish(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
  });
}

/**
 * Test users: the seeded personas, by key (member, family, familyMember,
 * noliability, storageWarning, …). See common/server/seed/scenarios/personas.js.
 */
type TestUser = { email: string; password: string; name: string | null; mid?: string };
export const testUsers: Record<string, TestUser> = Object.fromEntries(
  [...PERSONAS, ...E2E_PERSONAS].map((persona) => [
    persona.key,
    { email: persona.email, password: PASSWORD, name: persona.name, mid: persona.mid },
  ]),
);

/** The name the home page greets a user with. */
export const firstName = (user: TestUser) => (user.name || '').split(' ')[0];

/**
 * Open a page as a persona, already logged in: the e2e scenario gives every
 * persona a known login token, which goes into localStorage before the page
 * loads. No login page, no extra page load. The language is English.
 *
 * Use the login page itself only in tests about logging in.
 */
export async function openAs(page: Page, key: string, path = '/'): Promise<void> {
  if (!testUsers[key]) throw new Error(`No persona "${key}"`);
  const token = e2eLoginToken(key);
  await page.addInitScript((loginToken) => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('Meteor.loginToken', loginToken);
  }, token);
  await page.goto(path);
}

/**
 * Logout helper
 */
export async function logout(page: Page): Promise<void> {
  // Open hamburger menu and click logout
  await page.locator('.hamburger-menu').click();
  await page.getByText('Logout').click();
  await page.waitForURL('/login');
}

/**
 * Wait for Meteor to be ready (useful after navigation)
 */
export async function waitForMeteor(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    return typeof (window as any).Meteor !== 'undefined' &&
           (window as any).Meteor.status().connected;
  }, { timeout: 10000 });
}

/**
 * Selectors for common elements
 * Using Swedish translations from i18n file for text-based selectors
 */
export const selectors = {
  // Login page
  loginEmailInput: '#email',
  loginPasswordInput: 'input[type="password"]',
  loginButton: 'button[type="submit"]',

  // Home page
  homeLogo: 'img[alt="Uppsala Makerspace Logo"]',
  homeGreeting: 'main h3',
  homeLiabilityButton: 'a[href="/liability"] button',
  // The bottom navigation; the home page no longer has its own links there
  homeUnlockLink: 'nav a[href="/unlock"]',
  homeCalendarLink: 'nav a[href="/calendar"]',
  acceptInviteButton: `button:has-text("${en.acceptInvite}")`,
  declineInviteButton: `button:has-text("${en.declineInvite}")`,

  // Unlock page
  doorButton: 'button.door-button',
  doorLabel: '.door-label',
  liabilityLink: 'main a[href="/liability"]',

  // Liability page
  liabilityTitle: `h1:has-text("${en.liabilityTitle}")`,
  liabilityCheckbox: '#liability-checkbox',
  liabilityApproveButton: `button:has-text("${en.liabilityApproveButton}")`,
  liabilityStatusGreen: '.bg-green-100',
  liabilityStatusYellow: '.bg-yellow-100',
  liabilityStatusBlue: '.bg-blue-100',

  // Account page
  memberName: 'span.font-bold.text-center.text-xl',
  memberId: 'span:has-text("M00")',
  membershipType: `span:has-text("${en.TypeOfMembership}")`,
  familyMembersSection: `span:has-text("${en.FamilyMembers}")`,
  addFamilyMemberButton: `button:has-text("${en.AddFamilyMember}")`,
  familyEmailInput: '#family_member_email',
  saveButton: `button:has-text("${en.Save}")`,
  sendInviteButton: `button:has-text("${en.SendInvite}")`,
  trashIcon: '.fa-trash',

  // Email verification page (language-independent selectors)
  verificationPage: 'main h1',
  sendVerificationButton: `main button:has-text("${en.SendNewVerification}")`,

  // Navigation
  hamburgerMenu: '.hamburger-menu',
};

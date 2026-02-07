import { Page, expect } from '@playwright/test';
import en from '../imports/i18n/en.json';

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
 * Test user credentials
 */
export const testUsers = {
  member: {
    email: 'member@test.com',
    password: 'password123',
    name: 'Test Member',
  },
  noliability: {
    email: 'noliability@test.com',
    password: 'password123',
    name: 'No Liability Member',
  },
  noliability2: {
    email: 'noliability2@test.com',
    password: 'password123',
    name: 'No Liability Member 2',
  },
  familyPayer: {
    email: 'family@test.com',
    password: 'password123',
    name: 'Family Payer',
  },
  invited: {
    email: 'invited@test.com',
    password: 'password123',
    name: 'Invited Member',
  },
  toInvite: {
    email: 'toinvite@test.com',
    password: 'password123',
    name: 'To Invite Member',
  },
  unverified: {
    email: 'unverified@test.com',
    password: 'password123',
    name: null,
  },
  admin: {
    email: 'admin@test.com',
    password: 'adminadmin',
    name: 'Admin User',
  },
};

/**
 * Login helper - logs in a user with email and password
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  // Set language to English before any navigation
  await setLanguageEnglish(page);
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  // Wait for navigation to home page
  await page.waitForURL('/');
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
  homeLogo: 'img[alt="UM Logo"]',
  homeGreeting: 'h3.text-h3',
  homeLiabilityButton: 'a[href="/liability"] button',
  homeUnlockLink: 'a[href="/unlock"].wideButton',
  homeCalendarLink: 'a[href="/calendar"].wideButton',
  acceptInviteButton: `button:has-text("${en.acceptInvite}")`,
  declineInviteButton: `button:has-text("${en.declineInvite}")`,

  // Unlock page
  doorButton: 'button.door-button',
  doorLabel: '.door-label',
  liabilityLink: 'a[href="/liability"]',

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
  trashIcon: '.fa-trash',

  // Email verification page (language-independent selectors)
  verificationPage: '.login-form h1',
  sendVerificationButton: `.login-form button:has-text("${en.SendNewVerification}")`,

  // Navigation
  hamburgerMenu: '.hamburger-menu',
};

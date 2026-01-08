# E2E Test Specifications

This document contains natural language specifications for all E2E tests. When adding a new test, write a specification here first, then use it to generate the Playwright test code.

## Format

Each test specification should include:
- **Test name**: A descriptive name for the test
- **User**: Which test user to use (see helpers.ts for available users)
- **Preconditions**: Any setup or state required before the test
- **Steps**: The actions to perform
- **Expected results**: What should be verified

---

## Authentication Tests

### Test: Sign in with email and password

**User**: member@test.com (verified user with active membership)

**Preconditions**: User is not logged in

**Steps**:
1. Navigate to the login page
2. Verify the login form is displayed (logo and email input visible)
3. Enter email: member@test.com
4. Enter password: password123
5. Click the login button

**Expected results**:
- User is redirected to the home page (/)
- The greeting displays the user's first name "Test"

---

### Test: Redirect unverified user to email verification page

**User**: unverified@test.com (user with unverified email)

**Preconditions**: User is not logged in

**Steps**:
1. Navigate to the login page
2. Enter email: unverified@test.com
3. Enter password: password123
4. Click the login button

**Expected results**:
- User is redirected to the email verification page (/waitForEmailVerification)
- The verification page heading is visible
- The "Send verification link" button is visible

---

## Family Membership Tests

### Test: Display family members section for family payer

**User**: family@test.com (family membership payer)

**Preconditions**: User is logged in

**Steps**:
1. Log in as family@test.com
2. Navigate to the account page (/account)

**Expected results**:
- The member's name "Family Payer" is displayed
- The "Family members" section is visible
- The "Add family member" button is visible

---

### Test: Invite a new family member

**User**: family@test.com (family membership payer)

**Preconditions**: User is logged in, toinvite@test.com exists and is not in a family

**Steps**:
1. Log in as family@test.com
2. Navigate to the account page (/account)
3. Click the "Add family member" button
4. Enter email: toinvite@test.com in the family member email input
5. Click the "Save" button
6. Wait for the invite to be processed

**Expected results**:
- The "Invites" section is visible
- The invited email (toinvite@test.com) is displayed in the invites list

---

### Test: Show pending family invite on home page

**User**: invited@test.com (user with pending family invite)

**Preconditions**: User has a pending family invite from family@test.com

**Steps**:
1. Log in as invited@test.com

**Expected results**:
- The family invite message is displayed on the home page
- The "Accept invite" button is visible
- The "Decline invite" button is visible

---

### Test: Accept family invite

**User**: invited@test.com (user with pending family invite)

**Preconditions**: User has a pending family invite from family@test.com

**Steps**:
1. Log in as invited@test.com
2. Verify the family invite message is displayed
3. Click the "Accept invite" button
4. Wait for the action to complete

**Expected results**:
- The home page greeting is visible
- The family invite message is no longer visible
- User is now part of the family membership

---

## Liability Agreement Tests

### Test: Show liability agreement page and allow approval

**User**: noliability@test.com (user without approved liability)

**Preconditions**: User has not approved the liability agreement

**Steps**:
1. Log in as noliability@test.com
2. Verify the liability warning message is shown on the home page
3. Click the button to go to the liability page
4. Wait for navigation to /liability

**Expected results on liability page**:
- The "Liability Agreement" heading is visible
- A blue status banner shows "You have not yet approved the liability agreement"
- The liability checkbox is visible and unchecked
- The "Approve" button is visible but disabled

**Continue steps**:
5. Check the liability checkbox

**Expected results**:
- The "Approve" button becomes enabled

**Continue steps**:
6. Click the "Approve" button
7. Wait for approval to be processed

**Expected results**:
- A green status banner shows "You have approved the current liability agreement"
- The checkbox is no longer visible

---

### Test: Show approved status for member with approved liability

**User**: member@test.com (user with approved liability)

**Preconditions**: User has already approved the liability agreement

**Steps**:
1. Log in as member@test.com
2. Navigate to the liability page (/liability)

**Expected results**:
- A green status banner shows "You have approved the current liability agreement"
- The liability checkbox is not visible (already approved)

---

## Membership Status Tests

### Test: Display membership status on home page for active member

**User**: member@test.com (active member with approved liability)

**Preconditions**: User has active membership and approved liability

**Steps**:
1. Log in as member@test.com

**Expected results**:
- User is on the home page (/)
- The greeting contains the user's first name "Test"
- The "Open doors" link/button is visible
- The "Calendar" link/button is visible

---

### Test: Display membership details on account page

**User**: member@test.com (active member)

**Preconditions**: User has active membership

**Steps**:
1. Log in as member@test.com
2. Navigate to the account page (/account)

**Expected results**:
- The member's name "Test Member" is displayed
- The member ID "M001" is displayed
- The "Membership type" label is visible
- The "Membership end" date is visible
- The "days remaining" text is visible (indicating active membership)

---

## Unlock/Door Access Tests

### Test: Show liability message on unlock page when liability not approved

**User**: noliability2@test.com (user without approved liability)

**Note**: Uses noliability2 instead of noliability to avoid conflict with the liability approval test which modifies noliability's state.

**Preconditions**: User has NOT approved the liability agreement

**Steps**:
1. Log in as noliability2@test.com
2. Navigate to the unlock page (/unlock)

**Expected results**:
- The message "Before you can open doors, you need to approve the liability agreement" is visible
- A button/link to go to the liability agreement page is visible
- Door buttons are NOT visible

---

### Test: Show door buttons on unlock page when liability is approved

**User**: member@test.com (user with approved liability and lab access)

**Preconditions**: User has approved liability and active lab membership

**Steps**:
1. Log in as member@test.com
2. Navigate to the unlock page (/unlock)

**Expected results**:
- At least one door button is visible
- Door labels are visible (e.g., "Outer Door", "Upper floor")
- The liability warning message is NOT visible

---

### Test: Navigate from home to unlock page via button

**User**: member@test.com (user with approved liability)

**Preconditions**: User has approved liability and active membership

**Steps**:
1. Log in as member@test.com
2. Verify the "Open doors" link is visible on the home page
3. Click the "Open doors" link

**Expected results**:
- User is navigated to the unlock page (/unlock)
- Door buttons are visible on the unlock page

---

## Adding New Tests

When adding a new E2E test:

1. **Write the specification first** in this document following the format above
2. **Identify the test user** - use existing test users from helpers.ts or add a new one to seedTestData.js if needed
3. **Generate the test** - use the specification to create the Playwright test, referencing:
   - `helpers.ts` for login function, selectors, and test users
   - `en.json` for i18n text strings (tests run in English)
4. **Use appropriate selectors**:
   - Prefer `getByRole()` for buttons and headings
   - Use `getByText(en.translationKey)` for translated text
   - Use CSS selectors with `.wideButton` class to distinguish main page buttons from navigation
   - Use `.first()` when multiple elements might match

### Test Users Available

| Email | Password | Description |
|-------|----------|-------------|
| member@test.com | password123 | Active member with approved liability |
| noliability@test.com | password123 | Active member without liability approval (used by liability approval test) |
| noliability2@test.com | password123 | Active member without liability approval (used by unlock test) |
| family@test.com | password123 | Family membership payer |
| invited@test.com | password123 | Member with pending family invite |
| toinvite@test.com | password123 | Member available for family invitation |
| unverified@test.com | password123 | User with unverified email |
| admin@test.com | adminadmin | Admin user with admin role |

# UMSAPP - Uppsala MakerSpace App

## Getting Started

### Prerequisites

- Node.js
- Meteor
- MongoDB running on `localhost:27017`

### Installation

```bash
meteor install
npm install
```

### Running the App

Before you can start the application you need to make sure you have created a `settings.json` file, you can take inspiration from `settings_example.json`.

```bash
npm run dev
```

The app runs on `http://localhost:3001` by default.

## Development with Test Data

To populate your development database with test users for manual testing:

```bash
npm run seed:dev
```

This seeds the `umsme` database with test accounts. Press `Ctrl+C` after you see "Seeding complete" to exit. You can then run the normal dev server and log in with these credentials:

| Email | Password | Description |
|-------|----------|-------------|
| member@test.com | password123 | Active member with approved liability |
| noliability@test.com | password123 | Active member without liability approval |
| noliability2@test.com | password123 | Active member without liability approval |
| family@test.com | password123 | Family membership payer |
| invited@test.com | password123 | Member with pending family invite |
| toinvite@test.com | password123 | Member available for family invitation |
| unverified@test.com | password123 | User with unverified email |
| admin@test.com | adminadmin | Admin user with admin role |

**Warning:** This script clears existing data in the `users`, `members`, `membership`, `liabilityDocuments`, and `invites` collections before seeding.

## E2E Testing

The project uses Playwright for end-to-end testing.

### Prerequisites

- MongoDB running on `localhost:27017`
- Playwright browsers installed: `npx playwright install chromium`

### Running E2E Tests

```bash
# Run all tests (headless)
npm run test:e2e

# Run tests with Playwright UI (for debugging)
npm run test:e2e:ui
```

The test runner will:
1. Start a test server on port 3002 with a separate database (`umsapp-e2e-test`)
2. Seed the test database with fixture data
3. Run all Playwright tests
4. Shut down the test server

### Test Structure

Tests are located in the `e2e/` directory:

- `auth.spec.ts` - Sign-in flow
- `membership.spec.ts` - Membership status display
- `family.spec.ts` - Family invite, accept, and decline flows
- `liability.spec.ts` - Liability agreement approval flow
- `unlock.spec.ts` - Door unlock page (with/without liability)

### Adding New Tests

See `e2e/TEST_SPECIFICATIONS.md` for detailed test specifications in natural language. When adding a new test:

1. Write a test specification in `TEST_SPECIFICATIONS.md` first
2. Use the specification to generate the Playwright test code
3. Reference `helpers.ts` for login functions, selectors, and test users
4. Use `en.json` translations for text assertions (tests run in English)

### Manual Test Server

To start the test server manually (useful for debugging):

```bash
npm run start:test
```

This starts the app on `http://localhost:3002` with test data seeded.

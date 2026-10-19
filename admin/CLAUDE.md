# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UMSME (Uppsala MakerSpace Member administrative system) - A Meteor-based admin system for managing makerspace members, payments, door locks, and communications.

## Common Commands

```bash
# Development
npm run sigma              # Run with settings.json (recommended)
npm start                  # Run without settings (basic dev)
meteor                     # Direct meteor run

# Testing
npm test                   # Run tests once with Mocha
npm run test-app           # Run full-app tests with watch mode
npm run test:e2e           # Playwright e2e tests (port 3200, database umsme-admin-e2e)
E2E_DEV=1 npm run test:e2e # The same against development mode, for debugging

# Production build
meteor build ../umsme-build --architecture os.linux.x86_64

# Database
meteor reset               # Reset dev database (stops app first)
```

## Architecture

### Technology Stack
- **Framework:** Meteor 3.5.3 with Blaze templating
- **Database:** MongoDB with Collection2 (schema validation)
- **Routing:** FlowRouter (ostrio:flow-router-extra)
- **Forms:** AutoForm with Bootstrap 3 theme
- **Tables:** DataTables via aldeed:tabular (server-side pagination)
- **Auth:** Meteor accounts-password with role-based access

### Project Structure
```
admin/
├── client/
│   ├── main.js          # Entry point, routes, imports
│   ├── layouts/         # Blaze layout templates (AppBody, Home)
│   └── ui/              # Feature modules (members, payments, mail, etc.)
├── server/
│   ├── main.js          # Server entry point
│   ├── publications.js  # Meteor publications (data subscriptions)
│   ├── methods/         # Meteor methods (admin, bank, lock, mail, etc.)
│   └── cronjob/         # Scheduled tasks (synced-cron)
├── imports/
│   ├── common -> ../../common  # Symlink to shared code
│   └── tabular/         # DataTable configurations
└── tests/               # Mocha tests
```

### Shared Code (common/)
The `imports/common` symlink points to `../../common/` containing:
- `collections/` - MongoDB collection definitions (members, payments, messages, etc.)
- `lib/models.js` - Central data models and business logic
- `lib/schemas.js` - SimpleSchema definitions
- `lib/rules.js` - Business rules

### Key Patterns

**Reactive Data Flow:**
- Server publishes data via `publications.js` (role-restricted)
- Clients subscribe and use reactive collections
- Meteor methods handle mutations and external API calls

**UI Components:**
- Each feature in `client/ui/` has its own folder with .html (Blaze) and .js files
- Templates use `Template.dynamic` for dynamic rendering
- Forms generated from schemas using AutoForm

## React pages (migration in progress)

Admin is moving module by module from Blaze to React with MUI; see
`plan/migration.md` for the order and the per-module steps. `liability` is
done and is the pattern to follow:

- Server: domain functions in `common/server/<domain>/` (every write records
  to `AuditLog`), methods `<domain>.<action>` with `check()` and
  `requireRole` from `common/server/authz.js`, narrow publications
  `admin.<domain>.<view>` with field projections.
- Client: pages in `imports/ui/<module>/` as a container (`XxxPage.jsx`) and a
  pure component (`Xxx.jsx`), data and method calls in `data.js`, routed with
  `reactRoute()` from `client/react/reactRoute.js`. Navigate through
  `imports/ui/navigation.js`, never FlowRouter directly.
- MUI: import each component from its own path
  (`import Button from '@mui/material/Button'`), never from `'@mui/material'`:
  Meteor does not tree-shake, and the barrel import pulls in all of MUI.
- No client writes: a migrated collection loses its `allow` rules once no
  Blaze page writes to it.

## E2e tests

Playwright tests live in `e2e/`. `npm run test:e2e` starts admin in
production mode on port 3200 with `SEED=e2e`, which empties and seeds the
database `umsme-admin-e2e` (separate from the app's `umsme-e2e`, so both
suites can run at once) before the tests start.

- Start a test with `openAs(page, '<persona key>', '/path')` from
  `e2e/helpers.ts`: every persona has a seeded login token, so the page opens
  logged in. The personas are in `common/server/seed/scenarios/personas.js`;
  `admin`, `board`, `treasurer` and `storage` have the admin roles.
- Tests run in parallel and in any order. A test that changes data uses a
  persona or fixtures of its own (`E2E_PERSONAS`, `scenarios/e2e.js`);
  read-only tests may share.
- Select by what the user sees (`getByRole`, `getByLabel`, visible text),
  never by CSS classes or DOM structure: the same tests must pass when a
  module moves from Blaze to React (see `plan/migration.md`).
- Wait for what should appear (`expect(...).toBeVisible()`), never a fixed time.

## Dev gotchas

**AutoForm hook accumulation during hot-code-push (dev only):**
`AutoForm.hooks({ formId: {...} })` at module scope registers ADDITIVELY — each
call appends to the hook list, it does not replace. When Meteor's hot-code-push
re-evaluates a client module after a file save, the form gets an additional set
of hooks. After N reloads, a single submit fires N `onSubmit` handlers (N mails
sent, N Messages inserted, etc.). Does not affect production, where the bundle
loads once. Workaround: refresh the browser before testing form submissions after
file changes.

**External Integrations:**
- Swedbank bank API via separate proxy service (umsme-bank)
- Door lock system API (lock credentials in settings)
- SMTP email (configured via MAIL_URL env var)

## Configuration

Copy `example-settings.json` to `settings.json` and configure:
- `adminpassword` - Initial admin password
- `bankproxy` - URL to umsme-bank service
- `lockUsername/lockPassword` - Door lock API credentials
- `deliverMails` - Set false to disable email sending
- `reminderCron.enabled` - Must be explicitly `true` to send membership-expiry reminders (mail + push). Leave unset/false in dev so a copied member DB never triggers reminders.

Email requires `MAIL_URL` environment variable (see example-start.sh).

## Database

- Dev database name: `meteor` (default)
- Production database name: `umsme`
- Backup: `mongodump -h 127.0.0.1 --port 3001 -d umsme -o backup/`
- Restore: `mongorestore -h 127.0.0.1 --port 3001 --drop -d umsme backup/`

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

# Component development
npm run storybook          # Storybook for the React pages, port 6007

# Production build
meteor build ../umsme-build --architecture os.linux.x86_64

# Database
meteor reset               # Reset dev database (stops app first)
```

## Architecture

### Technology Stack
- **Framework:** Meteor 3.5.3; the pages are React 19 with MUI (see below),
  inside a Blaze layout (`AppBody`) that goes last
- **Database:** MongoDB with Collection2 (schema validation)
- **Routing:** FlowRouter (ostrio:flow-router-extra), through `reactRoute()`
- **Lists:** MUI X DataGrid (`DataList`, `ServerDataList` for server paging)
- **Auth:** Meteor accounts-password with role-based access

### Project Structure
```
admin/
├── client/
│   ├── main.js          # Entry point, routes, imports
│   ├── layouts/         # Blaze layout templates (AppBody, Home)
│   ├── react/           # reactRoute, the bridge from FlowRouter to React pages
│   └── ui/              # Per module: the routes (index.js)
├── server/
│   ├── main.js          # Server entry point
│   ├── publications.js  # Meteor publications (data subscriptions)
│   ├── methods/         # Meteor methods (admin, bank, lock, mail, etc.)
│   └── cronjob/         # Scheduled tasks (synced-cron)
├── imports/
│   ├── common -> ../../common  # Symlink to shared code
│   └── ui/              # The React pages, per module
└── tests/               # Mocha tests
```

### Shared Code (common/)
The `imports/common` symlink points to `../../common/` containing:
- `collections/` - MongoDB collection definitions (members, payments, messages, etc.)
- `lib/models.js` - Central data models and business logic
- `lib/schemas.js` - SimpleSchema definitions
- `lib/rules.js` - Business rules

### Key Patterns

**Data Flow:**
- Narrow, role-restricted publications in `publications.js` for small views;
  large lists and details through methods
- Every write goes through a Meteor method; no client writes

## React pages

Every module is React with MUI (`plan/migration.md` tells how it moved from
Blaze; only the admin console's one-off tools and the layout are left).
`liability` is the pattern to follow:

- Server: domain functions in `common/server/<domain>/` (every write records
  to `AuditLog`), methods `<domain>.<action>` with `check()` and
  `requireRole` from `common/server/authz.js`, narrow publications
  `admin.<domain>.<view>` with field projections.
- Client: pages in `imports/ui/<module>/` as a container (`XxxPage.jsx`) and a
  pure component (`Xxx.jsx`) with stories next to it (`Xxx.stories.jsx`).
  Data and method calls go in `data.js`, which only containers import; a pure
  component imports nothing from Meteor, so Storybook can show it without
  stubs (put helpers it needs, like `liability/dates.js`, in Meteor-free
  files). Storybook renders with the MUI theme on top of Bootstrap 3, as
  admin does. Pages are routed with
  `reactRoute()` from `client/react/reactRoute.js`.
- Lists: always `DataList` (`imports/ui/components/DataList.jsx`), MUI X
  DataGrid with search, sorting and paging set up the same everywhere, with
  columns from the helpers in `columns.jsx` where they fit. Give it
  `rowHref` so the whole row opens the row's page (most lists should), and
  keep a link column for the keyboard and middle-click. Every list's e2e
  tests check search and sorting with `e2e/lists.ts`.
- Shared pieces in `imports/ui/components/`: `useEditor` (an edit page's
  values, the version a save is checked against, busy, error, notice),
  `ImageField` (an image or icon with upload and removal), `ChipSelect`
  (pick several from many: search, dropdown, removable pills; use it instead
  of a long list of checkboxes), `BlazeTemplate` (a not yet migrated Blaze
  piece inside a React page; containers only).
- One Save per edit page: everything that can wait for Save is a field of the
  form, before the Save button, and is saved with it, including links to
  other things (an item's workshops, a workshop's or group's spaces, a
  group's related workshops). Blaze pages often saved such links on their
  own, at once, because AutoForm could not hold them; do not carry that
  over. Only what must take effect at once sits after Save, as its own
  action: uploading an image or icon, actions on other documents.
- Navigation goes through `useNavigate()` from `imports/ui/navigation.js`, a
  context that reactRoute fills with FlowRouter; never import FlowRouter.
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

**External Integrations:**
- Swedbank bank API via separate proxy service (umsme-bank)
- Door lock system API (lock credentials in settings)
- SMTP email (configured via MAIL_URL env var)

## Configuration

Copy `example-settings.json` to `settings.json` and configure:
- `adminpassword` - Initial admin password
- `lockUsername/lockPassword` - Door lock API credentials
- `deliverMails` - Set false to disable email sending
- `reminderCron.enabled` - Must be explicitly `true` to send membership-expiry reminders (mail + push). Leave unset/false in dev so a copied member DB never triggers reminders.
- `lockApi` - `"fake"` puts a stand-in for the Danalock API in place (`server/lock/`), its state in the collection `fakeLockApi`, seeded by the demo and e2e scenarios. Leave unset in production.
- `bankproxy` - The umsme-bank proxy's URL, or `"fake"` for a stand-in (`server/bank/`) whose transactions and sign-in state live in `fakeBankApi`, seeded likewise. `settings_demo.json` sets both to `"fake"`.

Email requires `MAIL_URL` environment variable (see example-start.sh).

## Database

- Dev database name: `meteor` (default)
- Production database name: `umsme`
- Backup: `mongodump -h 127.0.0.1 --port 3001 -d umsme -o backup/`
- Restore: `mongorestore -h 127.0.0.1 --port 3001 --drop -d umsme backup/`

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
- **Framework:** Meteor 3.5.3 with React 19 and MUI (see below); no Blaze
- **Database:** MongoDB with Collection2 (schema validation)
- **Routing:** React Router 6 (`react-router-dom`, as in the app), through
  `reactRoute()`
- **Lists:** MUI X DataGrid (`DataList`, `ServerDataList` for server paging)
- **Auth:** Meteor accounts-password with role-based access

### Project Structure
```
admin/
├── client/
│   ├── main.html        # <head> and the element the app renders into
│   ├── main.jsx         # Entry point: every module's routes, then App
│   ├── react/           # reactRoute (the route table) and App (router, frame, sign-in)
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

Every page is React with MUI (`plan/migration.md` tells how admin moved from
Blaze). The frame around them, top bar, menu and signing in, is
`imports/ui/shell/` (`AdminShell`, `SignIn`, the menu in `menu.js`), put
together with the router in `client/react/App.jsx`.
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
  files). Storybook renders with the MUI theme and `CssBaseline`, as admin
  does. Pages are routed with `reactRoute(path, name, Page)` from
  `client/react/reactRoute.js`; the route's parameters are the page's props,
  and `{ layout: 'Clean' }` leaves out the frame (the public pages).
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
  of a long list of checkboxes), `DateField` (a day, always YYYY-MM-DD, with
  a calendar button; never `<TextField type="date">`, which writes the day
  in the browser's language, MM/DD/YYYY in English).
- Dates are shown the Swedish way, 2026-10-23 and 2026-10-23 14:05, with
  `day()` and `dateTime()` from `imports/ui/dates.js`, never
  `toLocaleString()` without a locale.
- One Save per edit page: everything that can wait for Save is a field of the
  form, before the Save button, and is saved with it, including links to
  other things (an item's workshops, a workshop's or group's spaces, a
  group's related workshops). The old Blaze pages often saved such links on
  their own, at once; do not bring that back. Only what must take effect at once sits after Save, as its own
  action: uploading an image or icon, actions on other documents.
- Navigation goes through `useNavigate()` from `imports/ui/navigation.js`, a
  context App fills with React Router; pages never import the router. Plain
  links (`<a href>`, `Link`, `Button href`) to admin's pages go through the
  router too: App catches their clicks. Links elsewhere (`/api/...` files,
  other sites) load as usual.
- MUI: import each component from its own path
  (`import Button from '@mui/material/Button'`), never from `'@mui/material'`:
  Meteor does not tree-shake, and the barrel import pulls in all of MUI.
- No client writes: no collection has `allow` rules; every write goes
  through a method.

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
  never by CSS classes or DOM structure, so that a test outlives a page
  being rebuilt (the suite outlived the move from Blaze to React).
- Wait for what should appear (`expect(...).toBeVisible()`), never a fixed time.
- Signing out ends the session's login token. A test that signs out signs
  in with the form first (see `shell.spec.ts`); signing out after
  `openAs()` would end the persona's seeded token for every other test.

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

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

# Production build
meteor build ../umsme-build --architecture os.linux.x86_64

# Database
meteor reset               # Reset dev database (stops app first)
```

## Architecture

### Technology Stack
- **Framework:** Meteor 3.1.2 with Blaze templating
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

Email requires `MAIL_URL` environment variable (see example-start.sh).

## Database

- Dev database name: `meteor` (default)
- Production database name: `umsme`
- Backup: `mongodump -h 127.0.0.1 --port 3001 -d umsme -o backup/`
- Restore: `mongorestore -h 127.0.0.1 --port 3001 --drop -d umsme backup/`

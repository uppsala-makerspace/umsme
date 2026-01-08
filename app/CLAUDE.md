# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UMSAPP is a membership management application for Uppsala MakerSpace. It handles member registration, membership payments (via Swish), and access control for the makerspace facility.

## Development Commands

```bash
# Run the application (requires settings.json) - runs on port 3001
meteor --settings settings.json

# Run tests
meteor test --once --driver-package meteortesting:mocha

# Run full-app tests with watch mode
TEST_WATCH=1 meteor test --full-app --driver-package meteortesting:mocha

# Storybook for component development
npm run storybook

# Build Tailwind CSS (watch mode)
npm run build:css
```

## Configuration

The app requires a `settings.json` file (see `settings_example.json` for structure). This file contains:
- OAuth credentials for Google/Facebook login
- Swish payment callback URLs
- VAPID keys for push notifications
- Email configuration

## Architecture

### Technology Stack
- **Frontend**: React 19, react-router-dom, Tailwind CSS
- **Backend**: Meteor.js with MongoDB
- **i18n**: i18next with Swedish (sv) as default, English (en) as fallback
- **Payments**: Swish (Swedish mobile payment)
- **Auth**: Meteor Accounts with Google/Facebook OAuth

### Directory Structure
```
app/
├── client/           # Client entry point and styles
├── server/           # Server-side code
│   ├── accounts.js   # OAuth and account handling
│   ├── umsapp.js     # Main Meteor methods
│   └── api/          # REST endpoints via WebApp.handlers
├── imports/
│   ├── ui/           # App.jsx with router setup
│   ├── pages/        # Page components (Home/, Login/, account/, etc.)
│   ├── components/   # Shared components
│   ├── hooks/        # React hooks (e.g., push notification setup)
│   ├── i18n/         # Translation files (en.json, sv.json)
│   └── common/ -> ../../common/  # Symlink to shared code
└── .storybook/       # Storybook configuration
```

### Shared Code (../common/)
Code shared between this app and potentially other apps:
- `collections/` - MongoDB collection definitions (Members, Memberships, Payments, etc.)
- `lib/models.js` - Schema definitions using SimpleSchema
- `lib/utils.js` - Shared utilities like `memberStatus()` for membership calculations
- `lib/rules.js` - Business rules for membership pricing and duration

### Data Model
Key collections:
- **Members**: Member profile (name, email, mobile, family status, youth status)
- **Memberships**: Membership periods with start/end dates and types
- **Payments**: Payment records (Bankgiro, Swish)
- **PendingMembers**: Users who registered but haven't completed member creation

Membership types:
- `member` - Basic membership (yearly)
- `lab` - Lab access (quarterly)
- `labandmember` - Combined membership and lab access
- Family memberships are flagged with `family: true`
- Discounted rates for certain members

### Key Patterns

**Meteor Methods** (server/umsapp.js):
- `findMemberForUser` - Get member from verified email
- `findInfoForUser` - Get full member info including status, family members
- `swish.createTestPayment` - Initiate Swish payment
- `savePendingMember` - Store pre-registration data

**React Components**:
- Pages use `useTracker` for reactive Meteor data
- `Meteor.callAsync` for method calls
- Components styled with Tailwind CSS

**Authentication Flow**:
1. User signs up/logs in (email or OAuth)
2. Email verification sent
3. User completes member profile (stored in PendingMembers)
4. After verification, `createMemberFromPending` creates actual Member

### REST API
REST endpoints defined in `server/api/` using `WebApp.handlers`:
```javascript
WebApp.handlers.use("/api/endpoint", async (req, res) => { ... });
```

## Language

The codebase contains Swedish comments and error messages. Default UI language is Swedish.

## Git Commits

- Do not include "Generated with Claude Code" or "Co-Authored-By" footers in commit messages

## Working Directory

- Stay within `umsme2/app/` and `umsme2/common/` directories when working on this project
- Do not search or operate in other parent or sibling directories

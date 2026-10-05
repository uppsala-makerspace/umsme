# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Overview

UMSME (Uppsala MakerSpace MEmber administrative system) is a monorepo containing three Meteor applications that share a common codebase:

- **admin/** - Administrator dashboard (Meteor + Blaze + Bootstrap 3)
- **app/** - Member-facing PWA (Meteor + React + Tailwind CSS)
- **payment/** - Payment callback service (minimal Meteor, server-only)
- **common/** - Shared collections, schemas, and business logic

Each application has its own CLAUDE.md with specific guidance. See `admin/CLAUDE.md`, `app/CLAUDE.md`, and `payment/CLAUDE.md` for app-specific commands and patterns.

## Shared Code (common/)

All applications access shared code via symlinks (`imports/common -> ../../common/`).

**Collections** (`common/collections/`):
- members.js, users.js, memberships.js, payments.js
- liabilityDocuments.js, invites.js, pendingMembers.js
- messages.js, mails.js, templates.js
- pushSubs.js, unlocks.js, certificates.js

**Library** (`common/lib/`):
- `models.js` - Central data models and enums
- `schemas.js` - SimpleSchema definitions for Collection2
- `rules.js` - Business rules (membership pricing, duration calculations)
- `utils.js` - Shared utilities (memberStatus, date calculations)

Changes to common/ affect all applications. Test in all relevant apps after modifying shared code.

## Working Directory

When working on this monorepo:
- For admin work: operate within `admin/` and `common/`
- For app work: operate within `app/` and `common/`
- For payment work: operate within `payment/` and `common/`
- Run commands from within the respective application directory, not from the monorepo root

## Quick Reference

| Task | Admin | App | Payment |
|------|-------|-----|---------|
| Dev server | `npm run sigma` | `npm run dev` (port 3001) | `npm run dev` (port 3003) |
| Tests | `npm test` | `npm run test:e2e` | `npm test` |
| Build | `npm run build` | `npm run build` | `npm run build` |
| Component dev | N/A | `npm run storybook` | N/A |

## Scripts

**scripts/fetch-slack-channels.js** - Updates Slack channel list for app
**scripts/mongodb/** - Database backup and restore utilities

## External Services

- **Swedbank** - Bank integration via separate umsme-bank proxy service
- **Swish** - Swedish mobile payments (app initiates, payment/ receives callbacks)
- **Door Lock API** - Custom integration for facility access
- **OAuth** - Google and Facebook login

## Manager events

Server-side dispatcher in `common/server/managerEvents/` posts operational
signals (a new payment, a renewal, a storage request) to subscribed
channels — Slack today, more transports later. Distinct from
`common/server/push.js` which delivers push notifications to members.

Call sites use:

```js
import { publishManagerEvent, ManagerEventType } from '/imports/common/server/managerEvents';
await publishManagerEvent(ManagerEventType.NEW_MEMBER_PAYMENT, {
  subject: 'New member payment',
  body: '*Alice* paid 700 kr — `memberBase`.',
});
```

Adding a new event type is three steps:
1. Add an entry to `ManagerEventType` in `common/server/managerEvents/index.js`.
2. Call `publishManagerEvent(...)` from the relevant server code.
3. List the type in the appropriate channel's `subscriptions` array under
   `private.managerEvents.channels` in the app's `settings.json`.

Settings live per-app because Meteor settings are per-app:
- `payment/settings.json` for payment-related events (where
  `processPayment` fires).
- `app/settings.json` for PWA-triggered events (e.g. box requests).
- `admin/settings.json` if admin-side events get wired later.

Dev tip: set `"webhookUrl": "console:dev"` on a channel to log the
formatted payload to stdout instead of POSTing to Slack.

## Developing against a copy of production

Local databases are often copies of production, full of real members, their
emails and their push subscriptions. Two settings keep dev from contacting them:

- `private.recipientWhitelist` (in each app's `settings.json`): when set,
  mail and push reach only these addresses, and an empty list reaches no one.
  Enforced in `common/server/recipientGuard.js` — `isEmailAllowed` for mail
  and `sendPushToSubscriptions` for every push. Production leaves the key out,
  which means everyone. The example settings ship with an empty list, so a
  fresh dev setup contacts no one until you add your own addresses. The older
  `private.emailWhitelist` is still honoured when the new key is absent, with
  its old meaning (empty means everyone).
- Local VAPID keys: dev uses its own `vapidPublicKey`/`vapidPrivateKey`, so
  push to subscriptions copied from production is rejected by the push
  services. Never put the production keys in a dev `settings.json`.

## Git Commits

Do not include "Generated with Claude Code" or "Co-Authored-By" footers in commit messages.

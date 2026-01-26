# CLAUDE.md

This file provides guidance to Claude Code when working with the Swish callback service.

## Project Overview

Minimal Meteor application that receives Swish payment callbacks and processes them into the shared UMSME database.

## Development Commands

```bash
# Run the development server (port 3003)
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Architecture

### Directory Structure
```
swish/
├── server/
│   ├── main.js           # Entry point
│   └── api/
│       ├── swish.js      # Swish HTTP callback handler
│       └── payments.js   # Shared payment processing logic
├── imports/
│   └── common -> ../../common  # Shared collections
└── tests/
    └── main.js           # Mocha tests
```

### Shared Code
Uses symlink to access shared code from `../common/`:
- Collections: `initiatedPayments`, `Payments`, `Members`, `Memberships`
- Models and schemas from `lib/models.js` and `lib/schemas.js`
- Business rules from `lib/rules.js`

### Database
Connects to the same MongoDB as admin and app (`mongodb://localhost:27017/umsme`).

## Key Files

- `server/api/swish.js` - Swish HTTP callback handler with:
  - All Swish status types (PAID, ERROR, CANCELLED, DECLINED)
  - Idempotency checking
  - Orphan payment support
  - Optional callbackIdentifier validation

- `server/api/payments.js` - Shared payment processing logic:
  - `addPayment()` - Creates payment records
  - `processPayment()` - Creates memberships from payments
  - `membershipFromPayment()` - Calculates membership parameters

## Swish Callback Flow

1. Swish sends POST to `/swish/callback`
2. Handler validates request method and JSON body
3. Looks up `initiatedPayment` by `swishID`
4. For PAID status:
   - Creates Payment record
   - Creates Membership based on `paymentType`
   - Updates `initiatedPayment` status
5. For other statuses: Updates `initiatedPayment` status only
6. Returns 200 to prevent Swish retries

## Git Commits

Do not include "Generated with Claude Code" or "Co-Authored-By" footers in commit messages.

## Working Directory

When working on this service:
- Operate within `swish/` and `common/`
- Test changes affect shared collections carefully

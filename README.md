# UMSME - Uppsala MakerSpace MEmber administrative system

This is a monorepo containing three Meteor applications:

- `app` - Member-facing PWA (Progressive Web Application) for desktop and mobile
- `admin` - Administrator interface for database management
- `payment` - Payment callback service for processing Swish payments

See the README in each directory for more details.

## Trying it out with demo data

```bash
./scripts/demo.sh            # seed fresh demo data, then start all three apps
./scripts/demo.sh --no-seed  # start on the demo data already there
```

Admin runs on http://localhost:3000, the app on http://localhost:3001 and
payment on :3003, all against the local database `umsme-demo`. You need a
local MongoDB running as replica set `rs0`, and nothing else on those ports.

The demo is an invented association of about 200 members with three years of
history, groups and workshops, certificates, storage, expenses and a web shop.
Log in to admin as `admin` / `admin`, or anywhere with one of the people below
and the password `password123`; the full list is printed when seeding finishes.

| Login | Who |
|-------|-----|
| `admin@example.org`, `board@example.org`, `treasurer@example.org`, `storage@example.org` | One per admin role |
| `member@example.org` | Active lab member |
| `family@example.org` | Family payer with two family members |
| `expiring@example.org`, `expired@example.org` | Membership ending soon, and ended |
| `pending@example.org`, `excluded@example.org` | Waiting for board approval, and excluded |
| `group-leader@example.org`, `steering@example.org` | Wood workshop steering group |

Swish, the bank, the door locks and Slack are turned off; what they would have
produced is part of the data. Mail and push are created but never sent.

## Common

The `common` directory contains schema definitions, collections, and utility functions shared across all applications. It is accessible via symlinks from each app's `imports/common`.

## Admin

Uses publications and Meteor reactivity to keep data in sync between the database and frontend.
Built with Collection2, Blaze, FlowRouter, Tabular, AutoForm, and Bootstrap 3.

## App

Uses Meteor methods to fetch data.
Built with React, React Router, and Tailwind CSS.

## Payment

Minimal server-only application that receives Swish payment callbacks and processes them into the shared database.

## Documentation

Comprehensive system documentation is in the [`docs/`](docs/README.md) folder:

| Document | Contents |
|----------|----------|
| [Architecture](docs/architecture.md) | How the three apps work together, shared DB |
| [Data Model](docs/data-model.md) | All collections, schemas, and relationships |
| [Business Rules](docs/business-rules.md) | Membership types, pricing, renewals, family rules |
| [Payments](docs/payments.md) | Swish and Bankgiro payment flows |
| [Door Access](docs/door-access.md) | Door unlocking via Home Assistant and legacy Danalock |
| [Certificates](docs/certificates.md) | Certificate types and attestation workflow |
| [Messaging](docs/messaging-notifications.md) | Email, push notifications, templates |
| [Auth and Roles](docs/auth-and-roles.md) | Authentication, authorization, and member onboarding |
| [Configuration](docs/configuration.md) | Settings, deployment, and development setup |

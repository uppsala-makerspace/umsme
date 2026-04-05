# UMSME Documentation

UMSME (Uppsala MakerSpace MEmber) is the membership management system for
[Uppsala Makerspace](https://uppsalamakerspace.se), a Swedish makerspace. It
handles member registration, payments, door access, certificates, and
administrative tasks. The system is built as a Meteor monorepo with three
applications sharing a single MongoDB database.

## Monorepo Layout

| Directory    | Purpose                                                    |
| ------------ | ---------------------------------------------------------- |
| `admin/`     | Admin dashboard (Meteor + Blaze + Bootstrap 3)             |
| `app/`       | Member-facing PWA (Meteor + React 19 + Tailwind CSS)       |
| `payment/`   | Swish payment callback service (Meteor, server-only)       |
| `common/`    | Shared collections, schemas, and business logic            |
| `scripts/`   | Utilities (Slack channel sync, MongoDB backup/restore)     |

Each app symlinks `imports/common/` to `../../common/` so they all share the
same data layer and business rules.

## Technology Stack

| Layer           | Technology                          |
| --------------- | ----------------------------------- |
| Framework       | Meteor 3.x                         |
| Runtime         | Node.js                            |
| Database        | MongoDB                            |
| Admin UI        | Blaze + Bootstrap 3                |
| Member UI       | React 19 + Tailwind CSS            |
| Schemas         | SimpleSchema / Collection2         |
| Scheduled jobs  | synced-cron                        |
| Internationalization | i18next                        |

## External Services

| Service          | Role                                              |
| ---------------- | ------------------------------------------------- |
| Swish            | Swedish mobile payments (QR and direct)           |
| Swedbank         | Bank transaction sync via umsme-bank proxy        |
| Home Assistant   | Door lock control for facility access             |
| Google OAuth     | Member authentication                             |
| SMTP             | Email delivery for notifications and receipts     |

## Documentation Map

| Document                                          | Contents                                          |
| ------------------------------------------------- | ------------------------------------------------- |
| [architecture.md](architecture.md)                | How the three apps work together, shared DB, deployment |
| [data-model.md](data-model.md)                    | All collections, schemas, and relationships       |
| [business-rules.md](business-rules.md)            | Membership types, pricing, renewals, family rules |
| [payments.md](payments.md)                        | Swish and Bankgiro payment flows                  |
| [door-access.md](door-access.md)                  | Door unlocking via Home Assistant and legacy Danalock |
| [certificates.md](certificates.md)                | Certificate types and attestation workflow         |
| [messaging-notifications.md](messaging-notifications.md) | Email, push notifications, templates       |
| [auth-and-roles.md](auth-and-roles.md)            | Authentication, authorization, and member onboarding |
| [configuration.md](configuration.md)              | Settings, deployment, and development setup          |

## Quick Start

Each application has its own README with full setup instructions. The table
below lists the dev server commands:

| App     | Command         | URL                    |
| ------- | --------------- | ---------------------- |
| Admin   | `npm run sigma` | http://localhost:3000  |
| App     | `npm run dev`   | http://localhost:3001  |
| Payment | `npm run dev`   | http://localhost:3003  |

Run commands from within the respective app directory (e.g. `cd admin && npm run sigma`).

All three apps connect to the same MongoDB instance. Starting the admin app
first is recommended since it runs on Meteor's default port and initializes the
database.

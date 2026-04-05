# UMSME - Uppsala MakerSpace MEmber administrative system

This is a monorepo containing three Meteor applications:

- `app` - Member-facing PWA (Progressive Web Application) for desktop and mobile
- `admin` - Administrator interface for database management
- `payment` - Payment callback service for processing Swish payments

See the README in each directory for more details.

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

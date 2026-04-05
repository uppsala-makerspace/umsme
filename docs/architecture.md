# UMSME Architecture

Uppsala MakerSpace Member administrative system -- architecture documentation.

For per-app guidance, see `admin/CLAUDE.md`, `app/CLAUDE.md`, and `payment/CLAUDE.md`.

---

## 1. System Overview

UMSME consists of three Meteor applications that share a single MongoDB database and a common code library. There is no direct inter-app communication -- all coordination happens through shared database state. When one app writes to a collection, the others see the change through MongoDB reactivity or polling.

The three apps serve distinct roles:

| App       | Purpose                        | Port | Stack                         |
|-----------|--------------------------------|------|-------------------------------|
| admin     | Staff dashboard                | 3000 | Meteor 3.1 + Blaze + Bootstrap 3 |
| app       | Member self-service PWA        | 3001 | Meteor + React 19 + Tailwind CSS |
| payment   | Payment callback receiver      | 3003 | Meteor (server-only, no UI)   |

---

## 2. Monorepo Structure

```
umsme/
├── admin/          Admin dashboard (Blaze + Bootstrap 3)
├── app/            Member PWA (React 19 + Tailwind CSS)
├── payment/        Payment callback service (server-only)
├── common/         Shared collections, schemas, business logic
│   ├── collections/
│   │   ├── members.js
│   │   ├── users.js
│   │   ├── memberships.js
│   │   ├── payments.js
│   │   ├── initiatedPayments.js
│   │   ├── certificates.js
│   │   ├── attestations.js
│   │   ├── liabilityDocuments.js
│   │   ├── Invites.js
│   │   ├── messages.js
│   │   ├── mails.js
│   │   ├── templates.js
│   │   ├── pushSubs.js
│   │   ├── unlocks.js
│   │   ├── comments.js
│   │   └── allow.js
│   └── lib/
│       ├── models.js       Central data models and field definitions
│       ├── schemas.js       SimpleSchema definitions (Collection2)
│       ├── rules.js         Business rules (pricing, duration, reminders)
│       ├── utils.js         memberStatus(), membership calculations
│       ├── dateUtils.js     Date helper functions
│       ├── fieldsUtils.js   Field projection helpers
│       └── message.js       Message/notification utilities
├── scripts/
│   ├── fetch-slack-channels.js
│   └── mongodb/            Database backup/restore utilities
├── certs/              TLS certificates for Swish
└── .devcontainer/      (unmaintained)
```

---

## 3. Shared Code Mechanism

All three apps access common code through a symlink:

```
admin/imports/common  ->  ../../common/
app/imports/common    ->  ../../common/
payment/imports/common -> ../../common/
```

In application code, shared modules are imported via the symlink path:

```js
import { Members } from '/imports/common/collections/members';
import { memberStatus } from '/imports/common/lib/utils';
import { membershipFromPayment } from '/imports/common/lib/rules';
```

Any change to files under `common/` affects all three applications. After modifying shared code, test in all relevant apps.

---

## 4. Application Responsibilities

### Admin App (port 3000)

Staff-facing dashboard built with Blaze templating, Bootstrap 3, FlowRouter, and AutoForm. Uses DataTables (aldeed:tabular) for server-side paginated tables.

**Features** (each is a module under `admin/client/ui/`):

| Module           | Purpose                                           |
|------------------|---------------------------------------------------|
| members          | Member CRUD, search, view details                 |
| membership       | Membership period management                      |
| bank             | Swedbank transaction sync via umsme-bank proxy    |
| lock / door      | Danalock sync, unlock history, door management    |
| mail             | Bulk email, individual messages                   |
| messagetemplate  | Email template management                         |
| message          | Message/notification management                   |
| certificates     | Certificate type management                       |
| liability        | Liability document management                     |
| storage          | Storage unit management                           |
| stats            | Statistics and reports                             |
| users            | User account and role administration              |
| admin            | System administration                              |
| check            | Member status check (QR-code based)               |
| family           | Family membership management                      |
| history          | Audit/history views                                |
| comment          | Comments on members                                |

**Server modules** (`admin/server/methods/`):
- `admin.js` -- system administration methods
- `bank.js` -- Swedbank proxy integration
- `lock.js` -- door lock API (Danalock)
- `mail.js` -- email sending and template rendering
- `check.js` -- member status verification
- `update.js` -- member data update methods
- `user.js` -- user/role management

**Authentication:** Meteor accounts-password with role-based access (`alanning:roles`).

**Data flow:** Server publishes data via `publications.js` (all role-restricted). Clients subscribe reactively. Mutations go through Meteor methods.

### Member App (port 3001)

Member-facing Progressive Web App built with React 19, react-router-dom, and Tailwind CSS.

**Routes and pages:**

| Route                              | Page                   | Purpose                          |
|------------------------------------|------------------------|----------------------------------|
| `/`                                | Home                   | Dashboard with status overview   |
| `/login`                           | Login                  | Email/OAuth sign-in              |
| `/register`                        | Register               | New member registration          |
| `/profile`                         | Profile                | Edit personal information        |
| `/account`                         | Account                | Account settings                 |
| `/membership`                      | MembershipSelection    | Choose membership type           |
| `/paymentSelection/:paymentType`   | PaymentSelection       | Choose payment method            |
| `/initiatedPayment/:externalId`    | InitiatedPayment       | Payment status polling           |
| `/unlock`                          | Unlock                 | Door lock control (Home Assistant)|
| `/certificates`                    | Certificates           | View certificates                |
| `/certificates/:certificateId`     | CertificateDetail      | Certificate detail               |
| `/certifier-requests/:attestationId` | CertifierRequestDetail | Certifier attestation review   |
| `/liability`                       | Liability              | Liability document approval      |
| `/storage`                         | Storage                | Storage unit management          |
| `/calendar`                        | Calendar               | Google Calendar integration      |
| `/map`                             | Map                    | Facility map                     |
| `/contact`                         | Contact                | Contact information              |
| `/install`                         | Install                | PWA installation instructions    |
| `/notifications`                   | Notifications          | Notification inbox               |
| `/notification-settings`           | NotificationSettings   | Push notification preferences    |
| `/forgotPassword`                  | ForgotPassword         | Password reset request           |
| `/resetPassword/:token`            | ResetPassword          | Password reset completion        |
| `/waitforemailverification`        | Verification           | Email verification waiting       |

**React contexts:**
- `MemberInfoContext` -- current member data and status
- `NotificationContext` -- in-app notification display
- `LocationContext` -- geolocation for proximity-based door unlock
- `AppDataContext` -- shared app-level reactive data

**Authentication flow:**
1. User signs up via email or OAuth (Google/Facebook)
2. Email verification is sent
3. User completes member profile (stored in `PendingMembers` collection)
4. After verification, `createMemberFromPending` creates the actual `Member` document

**Important pattern:** Meteor method calls must be sequential (`await` between each call), never parallel with `Promise.all`. Parallel calls can race with DDP login and arrive before the session is established.

### Payment Service (port 3003)

Minimal server-only Meteor app that receives payment callbacks and processes them into the shared database. Has no UI.

**Key files:**
- `server/api/swish.js` -- HTTP callback handler (`POST /swish/callback`)
- `server/api/payments.js` -- Payment processing logic (`addPayment`, `processPayment`)

**Swish callback handler** supports:
- All Swish status types: PAID, ERROR, CANCELLED, DECLINED
- Idempotency checking (skips already-processed payments)
- Orphan payment support (creates record for manual matching when no initiated payment is found)
- Optional `callbackIdentifier` validation
- Always returns HTTP 200 to prevent Swish retries

---

## 5. Data Flow: Swish Payment

A Swish payment is the primary example of how the three apps coordinate through the shared database:

1. **App** (3001) initiates the payment via the Swish API and creates an `InitiatedPayment` record.
2. **Swish** sends a callback to **Payment** (3003) once the member pays.
3. **Payment** creates `Payment` and `Membership` records, updates the `Member`.
4. **App** polls the `InitiatedPayment` status and sees the completed payment.
5. **Admin** (3000) sees the new records via its reactive subscriptions.

See [payments.md](payments.md#2-swish-payment-flow-primary) for the full step-by-step flow, sequence diagram, and processing details.

---

## 6. Shared Database

All three apps connect to the same MongoDB instance. Default connection: `mongodb://localhost:27017/umsme`.

### Collections

| Collection          | Defined in                        | Used by          | Purpose                                    |
|---------------------|-----------------------------------|------------------|--------------------------------------------|
| Members             | `common/collections/members.js`   | all three        | Member profiles and denormalized status     |
| Users               | `common/collections/users.js`     | admin, app       | Meteor user accounts                        |
| Memberships         | `common/collections/memberships.js`| all three       | Membership periods with start/end dates     |
| Payments            | `common/collections/payments.js`  | all three        | Payment records (Swish, Bankgiro)           |
| InitiatedPayments   | `common/collections/initiatedPayments.js` | app, payment | In-progress Swish payments             |
| Certificates        | `common/collections/certificates.js` | admin, app    | Certificate type definitions                |
| Attestations        | `common/collections/attestations.js` | admin, app    | Certificate attestation requests            |
| LiabilityDocuments  | `common/collections/liabilityDocuments.js` | admin, app | Liability waivers                      |
| Invites             | `common/collections/Invites.js`   | admin, app       | Member invitations                          |
| Messages            | `common/collections/messages.js`  | admin, app       | Individual messages                         |
| Mails               | `common/collections/mails.js`     | admin            | Bulk email records                          |
| Templates           | `common/collections/templates.js` | admin            | Email templates                             |
| PushSubs            | `common/collections/pushSubs.js`  | app              | Push notification subscriptions             |
| Unlocks             | `common/collections/unlocks.js`   | admin, app       | Door unlock history                         |
| Comments            | `common/collections/comments.js`  | admin            | Comments on member records                  |

### Coordination Model

There is no inter-app API. All coordination happens through MongoDB:

- **App** creates an `InitiatedPayment`, **Payment** finds it when the callback arrives
- **Payment** creates `Payment` and `Membership` records, **App** sees them reactively
- **Admin** reads the same data for management and manual operations
- Reactive updates in Meteor's Blaze (admin) and `useTracker` (app) automatically reflect database changes

### Membership Types

Three membership types exist:

- **member** -- Basic annual membership.
- **lab** -- Quarterly lab access (requires an active basic membership).
- **labandmember** -- Annual membership combined with annual lab access.

Pricing is defined in `app/private/paymentOptions.json` and mapped to membership parameters by `membershipFromPayment()` in `common/lib/utils.js`. See [business-rules.md](business-rules.md) for the full pricing table and duration details.

---

## 7. Configuration and Deployment

See [configuration.md](configuration.md) for all settings, environment variables, development setup, and deployment instructions.

---

## 8. Scheduled Tasks (Cron Jobs)

All apps use `chatra:synced-cron` for scheduled tasks. SyncedCron uses a shared MongoDB collection to prevent duplicate execution across instances.

### Admin Cron Jobs

| Job                              | Schedule           | File                                         | Purpose                                                        |
|----------------------------------|--------------------|----------------------------------------------|----------------------------------------------------------------|
| Sync unlocks and send a mail     | Daily at 03:00     | `admin/server/cronjob/syncAndMailUnlocks.js`  | Syncs door unlock history from Danalock, emails daily log to building management and admin |
| Cleanup pending attestations | Every 20 minutes | `admin/server/cronjob/cleanupPendingAttestations.js` | See [certificates.md](certificates.md#8-auto-cleanup-of-pending-attestations) |

### App Cron Jobs

| Job                              | Schedule                  | File                                        | Purpose                                                     |
|----------------------------------|---------------------------|---------------------------------------------|-------------------------------------------------------------|
| Notify expiring memberships      | Daily at 09:00 (configurable) | `app/server/cronjob/notifyExpiring.js`   | Sends push notifications to members whose membership or lab access is about to expire. Respects per-member notification preferences and family membership structure. |

### Payment Cron Jobs

| Job                                      | Schedule (configurable)    | File                                              | Purpose                                                  |
|------------------------------------------|----------------------------|---------------------------------------------------|----------------------------------------------------------|
| Expire stale initiated payments          | Every N seconds (default: 60s) | `payment/server/cronjob/expireInitiatedPayments.js` | Marks InitiatedPayments as EXPIRED if they remain in INITIATED status past the configured timeout (default: 360s for Swish) |

---

## 9. External Dependencies

```
                    +------------------+
                    |   Swish Cloud    |
                    | (payment API)    |
                    +--------+---------+
                             |
              initiates      |  callback
              payment        |  (POST)
                 |           |
    +------------v--+   +----v-----------+
    |   App (3001)  |   | Payment (3003) |
    +-------+-------+   +--------+-------+
            |                    |
            |     MongoDB        |
            +--------+-----------+
                     |
            +--------v--------+
            |  Admin (3000)   |
            +--------+--------+
                     |
         +-----------+-----------+
         |                       |
+--------v-------+    +----------v--------+
| Swedbank       |    | Danalock API      |
| (via umsme-bank|    | (door locks)      |
|  proxy)        |    +-------------------+
+----------------+
```

| Service              | Used by   | Purpose                                            |
|----------------------|-----------|----------------------------------------------------|
| Swish API            | app, payment | Swedish mobile payment. App initiates payment requests; Payment service receives callbacks. TLS client certificates in `certs/`. |
| Swedbank (umsme-bank)| admin    | Bank transaction sync via a separate proxy service. Admin fetches transactions for manual payment matching. |
| Home Assistant       | app       | Door lock control. Members unlock doors via the app, which calls the Home Assistant REST API. Supports proximity-based restrictions. |
| Danalock API         | admin     | Legacy door lock system. Admin syncs unlock history and manages lock groups. |
| Google OAuth         | app       | Member authentication (optional, configured in settings). |
| Facebook OAuth       | app       | Member authentication (optional, configured in settings). |
| SMTP server          | admin, app | Email delivery. Configured via `MAIL_URL` environment variable (admin) or `private.mailUrl` setting (app). |
| Google Calendar      | app       | Calendar event display in the member app.           |
| Slack                | app       | Slack channel listing and bot integration.          |

---

## 10. Internationalization

### App (member-facing)

The member app uses **i18next** with two languages:
- **Swedish (sv)** -- default language
- **English (en)** -- fallback

Translation files:
```
app/imports/i18n/
├── index.js      i18next configuration
├── sv.json       Swedish translations
└── en.json       English translations
```

### Database-level i18n

Certain collections store bilingual content:
- **Certificates** and **LiabilityDocuments** have `name.sv`/`name.en` and `text.sv`/`text.en` fields
- **Push notifications** include both language versions in the payload; the service worker stores and displays the appropriate language

### Admin

The admin interface is primarily in English (UI labels and code) with Swedish comments and some Swedish-language content in email templates and member-facing text.


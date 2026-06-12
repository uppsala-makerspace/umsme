# Configuration and Deployment

## 1. Settings Files

Each app has its own `settings.json` (git-ignored). Example files serve as templates:

| App     | Example file                    |
|---------|---------------------------------|
| admin   | `admin/example-settings.json`   |
| app     | `app/settings_example.json`     |
| payment | `payment/settings_example.json` |

---

## 2. Admin Settings

| Key                  | Purpose                                      |
|----------------------|----------------------------------------------|
| `adminpassword`      | Initial admin account password               |
| `bankproxy`          | URL to umsme-bank proxy service              |
| `lockUsername`        | Danalock API username                        |
| `lockPassword`       | Danalock API password                        |
| `lockAssumeUser`     | Lock API impersonation user                  |
| `groupLockName`      | Lock group name                              |
| `from`               | Allowed email sender addresses (string or array) |
| `noreply`            | No-reply sender address (default: `no-reply@uppsalamakerspace.se`) |
| `deliverMails`       | Enable/disable email delivery (must be truthy to send) |
| `reminderCron.enabled` | **Must be explicitly `true`** for the membership-reminder cron to send any mail or push. Unset or `false` => the job does nothing. Keep `false` in dev/staging so a copied member database never triggers reminders. |
| `reminderCron.hour`  | Hour of day the reminder cron runs (default: `9`) |
| `reminderCron.minute`| Minute the reminder cron runs (default: `0`)  |
| `syncNrOfTransactions`| Number of bank transactions to sync          |
| `public.adminUrl`    | Public base URL of the admin app (e.g. `https://umsme.uppsalamakerspace.se`; `http://localhost:3000` in dev). Used to build absolute links into admin — set explicitly because `Meteor.absoluteUrl()` is unreliable behind the reverse proxy. |
| `public.checkPath`   | Base URL for member QR check                 |
| `public.vapidPublicKey` | VAPID key for push notifications          |
| `private.notificationsPath` | Path to notification types JSON (default: bundled `private/notifications.json`) |
| `private.notifyExpiringTime` | Cron time for expiry notifications (e.g. `"at 09:00 am"`) |
| `expireInitiatedPayments`              | Array of stale-payment expiry job configs |
| `expireInitiatedPayments[].paymentType`| Payment type to expire (e.g. `"swish"`)   |
| `expireInitiatedPayments[].expiry`     | Seconds before expiration                 |
| `expireInitiatedPayments[].recurrence` | later.js text schedule, e.g. `"every 1 hour"` or `"every 30 seconds"` |
| `swishCallback`      | Swish callback URL                           |
| `serviceConfigurations` | OAuth credentials (Google, Facebook)      |
| `tests.path`         | Absolute path to the test-questions root (see [certificates.md](certificates.md#7b-test-based-certificates) for layout). Same setting in app's `settings.json`. |
| `private.googleDrive` | Receipt storage for expenses; same block as the app (see section 12). Admin uses it to download receipts for review. |
| `private.receiptTokenSecret` | Secret for signing receipt-image URLs (see section 12). If unset, a random per-process secret is used. |

---

## 3. App Settings

| Key                               | Purpose                                    |
|-----------------------------------|--------------------------------------------|
| `public.swish.disabled`           | Kill switch for Swish payments             |
| `public.adminUrl`                 | Public base URL of the admin app, used to build links into admin (e.g. expense manager events). Same value as admin's own `public.adminUrl`. |
| `public.vapidPublicKey`           | VAPID public key for push                  |
| `public.googleCalendar`           | Google Calendar API integration            |
| `public.slack.team`               | Slack team ID                              |
| `public.oauth`                    | Enabled OAuth providers                    |
| `private.vapidPrivateKey`         | VAPID private key for push                 |
| `private.paymentOptionsPath`      | Path to payment options JSON               |
| `private.mailUrl`                 | SMTP connection URL                        |
| `private.homeAssistant`           | Home Assistant URL, token, lock configs (see below) |
| `private.swish`                   | Swish API config (see below)               |
| `private.roomsPath`               | Path to rooms config JSON                  |
| `private.slackChannelsPath`       | Path to Slack channels JSON                |
| `private.slack.botToken`          | Slack bot token                            |
| `private.googleDrive`             | Receipt storage for expenses (see section 12) |
| `private.expenses.allowList`      | Member emails permitted to use the expenses feature (see section 12). Absent/empty => nobody. |
| `private.receiptTokenSecret`      | Secret for signing receipt-image URLs (see section 12). If unset, a random per-process secret is used. |
| `serviceConfigurations`           | OAuth credentials (Google, Facebook)       |
| `tests.path`                      | Absolute path to the test-questions root. Same setting in admin's `settings.json`. See [certificates.md](certificates.md#7b-test-based-certificates). |

---

## 4. Payment Settings

| Key                                    | Purpose                                |
|----------------------------------------|----------------------------------------|
| `swish.expectedCallbackIdentifier`     | Optional Swish callback validation     |

The expiry of stale initiated payments runs in the admin app, not the payment app. See `expireInitiatedPayments` under Admin Settings above.

---

## 5. Swish Configuration

Swish requires mutual TLS authentication. The Swish client (`app/server/methods/swish-client.js`) loads certificates from paths specified in Meteor settings:

```json
{
  "private": {
    "swish": {
      "certPath": "certs/swish.pem",
      "keyPath": "certs/swish.key",
      "caPath": "certs/swish-ca.pem",
      "callbackUrl": "https://example.com/swish/callback",
      "payeeAlias": "1234567890",
      "api": {
        "paymentRequest": "https://cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests",
        "qrCode": "https://mpc.getswish.net/qrg-swish/api/v1/commerce"
      }
    }
  }
}
```

| Setting | Description |
|---|---|
| `certPath` | Path to the Swish TLS client certificate (PEM format) |
| `keyPath` | Path to the corresponding private key |
| `caPath` | Path to the Swish CA certificate |
| `callbackUrl` | The public URL where Swish will POST callbacks (must reach the payment service on port 3003) |
| `payeeAlias` | The Swish number of the receiving organization |
| `api.paymentRequest` | Swish API endpoint for creating payment requests |
| `api.qrCode` | Swish API endpoint for generating QR code images |

The TLS agent is configured for TLSv1.2 only. The client is lazily initialized on first use and cached for subsequent requests.

### Callback identifier

An optional `expectedCallbackIdentifier` can be configured in `settings.swish` (payment app). When set, the callback handler rejects requests where `obj.callbackIdentifier` does not match, returning HTTP 403.

### Disabling Swish

Set `settings.public.swish.disabled` to `true` to disable Swish payments. The `payment.initiate` method will throw a `swish-disabled` error.

### Test setup

See `payment/TESTING_WITH_SWISH.md` for instructions on configuring Swish test certificates and the Swish simulator environment.

---

## 6. Home Assistant Configuration

Configuration lives in `settings.json` under `private.homeAssistant`:

```json
{
  "private": {
    "homeAssistant": {
      "url": "https://ha.example.com",
      "token": "<long-lived access token>",
      "proximityRange": 100,
      "locks": [
        {
          "id": "front-door",
          "entityId": "lock.front_door",
          "type": "lock",
          "location": { "lat": 59.858, "long": 17.632 }
        },
        {
          "id": "gate",
          "entityId": "switch.gate_relay",
          "type": "switch"
        }
      ]
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `url` | Base URL of the Home Assistant instance |
| `token` | Long-lived access token for the Home Assistant REST API |
| `proximityRange` | Maximum distance in meters for geofencing (default: 100) |
| `locks` | Array of lock definitions |

Each lock has:

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Stable identifier exposed to the client (e.g. `"front-door"`) |
| `entityId` | yes | Home Assistant entity ID (e.g. `lock.front_door` or `switch.gate_relay`) |
| `type` | yes | Either `"lock"` or `"switch"` -- determines the API service called |
| `location` | no | `{ lat, long }` -- if present, enables geofencing for this door |

See [door-access.md](door-access.md) for how these locks are used.

---

## 7. Danalock Configuration (Legacy)

Settings required in `settings.json` (admin app, top level):

| Setting | Description |
|---------|-------------|
| `lockUsername` | Danalock API username |
| `lockPassword` | Danalock API password |
| `lockAssumeUser` | Domain substring to identify the assumed user identity |
| `lockName` | Substring to match the target lock by name |
| `groupLockName` | Substring to match the lock group by name |

---

## 8. OAuth Configuration

Google OAuth credentials are stored in `Meteor.settings.serviceConfigurations.google` and loaded into the `ServiceConfiguration.configurations` collection at startup. The settings object must contain `clientId` and `secret`. See `app/settings_example.json` for the required structure.

Facebook OAuth infrastructure is present but currently commented out.

---

## 9. Email Configuration

Email requires:

1. The `MAIL_URL` environment variable (admin) or `private.mailUrl` setting (app) pointing to an SMTP server.
2. `Meteor.settings.deliverMails` must be truthy in the admin app. If not set, all email sending methods will refuse to send.

Sender addresses are configured via `Meteor.settings.from` (string or array) and `Meteor.settings.noreply`.

### Membership reminder cron

The daily reminder job (`admin/server/cronjob/sendReminders.js`) sends renewal
reminders — both email and push — to members within 14 days of expiry. It is
gated behind two independent flags and runs only when **both** hold:

1. `reminderCron.enabled === true` (the explicit opt-in guard).
2. `deliverMails` is truthy.

There is no environment auto-detection: the job will not fire unless
`reminderCron.enabled` is explicitly set to `true`. In dev/staging — including
when running against a copy of the production member database — leave it unset
or `false` so reminders can never be sent to real members. Only the production
admin app's `settings.json` should set it to `true`. The manual "Run now"
trigger (`reminders.runNow`) goes through the same job and is therefore subject
to the same guard.

---

## 10. Push Notification Configuration

VAPID keys must be configured in the app's `settings.json`:

- `Meteor.settings.public.vapidPublicKey` -- used by the client to subscribe
- `Meteor.settings.private.vapidPrivateKey` -- used by the server to sign push messages

If VAPID keys are not configured, the server logs a warning and push notifications are disabled.

---

## 11. Manager Events

Operational signals (a new payment, a renewal, a storage request) are fanned out to subscribed channels by the dispatcher in `common/server/managerEvents/`. They are distinct from push notifications (`common/server/push.js`): push notifications go to members on their phones, manager events go to the people running the org via ops channels. Slack is the only adapter today.

### Config shape

Channels live under `private.managerEvents.channels`:

```json
{
  "private": {
    "managerEvents": {
      "channels": [
        {
          "name": "boxes",
          "type": "slack",
          "webhookUrl": "https://hooks.slack.com/services/...",
          "subscriptions": ["boxRequest"]
        }
      ]
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `name` | Free-form label, used in dispatcher log lines |
| `type` | Channel adapter — only `"slack"` today |
| `webhookUrl` | Slack incoming-webhook URL. Use `"console:dev"` to log the formatted payload to stdout instead of posting |
| `subscriptions` | Array of `ManagerEventType` values this channel should receive |

### Event types

Defined in `common/server/managerEvents/index.js`:

| Type | Published from |
|------|----------------|
| `newMemberPayment`     | `payment/server/api/payments.js` |
| `membershipRenewed`    | `payment/server/api/payments.js` |
| `quarterlyLabPayment`  | `payment/server/api/payments.js` |
| `boxRequest`           | `app/server/methods/storage.js` |
| `expenseSubmitted`     | `app/server/methods/expenses.js` |
| `expenseRetracted`     | `app/server/methods/expenses.js` |
| `expenseConfirmed`     | `admin/server/methods/expenses.js` |
| `expenseRejected`      | `admin/server/methods/expenses.js` (includes the rejection reason) |
| `expenseReimbursed`    | `admin/server/methods/expenses.js` |
| `expenseUnreimbursed`  | `admin/server/methods/expenses.js` |

### Per-app placement (gotcha)

`Meteor.settings` is per-app, and so is the `managerEvents` block — it must live in the same app's `settings.json` as the publisher.

| Event | Where to configure the channel |
|-------|-------------------------------|
| `newMemberPayment`, `membershipRenewed`, `quarterlyLabPayment` | `payment/settings.json` |
| `boxRequest`, `expenseSubmitted`, `expenseRetracted` | `app/settings.json` |
| `expenseConfirmed`, `expenseRejected`, `expenseReimbursed`, `expenseUnreimbursed` | `admin/settings.json` |

Add the same channel to more than one file if a single Slack channel should receive events from multiple publishers (e.g. an "expenses" channel subscribing to `expenseSubmitted` in `app/settings.json` and to `expenseConfirmed`/`expenseReimbursed` in `admin/settings.json`).

### Adding a new event type

1. Add an entry to `ManagerEventType` in `common/server/managerEvents/index.js`.
2. Call `publishManagerEvent(...)` from the relevant server code.
3. List the type under `subscriptions` in the channel config of the app whose process publishes it.

---

## 12. Expense Receipt Storage (Google Drive)

Receipt photos for the expense feature are stored via `common/server/googleDrive.js`, which treats a Google **shared drive** as object storage (one folder per year under a root folder). Both the **app** (uploads, on submission) and the **admin** app (downloads, for review) read the same config, so the block must exist in both `app/settings.json` and `admin/settings.json` under `private.googleDrive`.

```json
{
  "private": {
    "googleDrive": {
      "backend": "drive",
      "keyFile": "config/expense-service-account.json",
      "sharedDriveId": "0AById...",
      "rootFolder": "Receipts"
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `backend` | `"drive"` for Google Drive, or `"local"` for development (see below) |
| `keyFile` | Path (relative to the app's working dir) to the service-account JSON key. Alternatively use `credentials` with an inline `{ client_email, private_key }` object |
| `credentials` | Inline service-account credentials, if not using `keyFile` |
| `sharedDriveId` | The ID of the shared drive (from its URL: `drive.google.com/drive/folders/<id>`) |
| `rootFolder` | Name of the folder created inside the shared drive to hold year subfolders (default `Receipts`) |

### Local backend (development / testing)

To run the expense feature without any Google setup, use the local backend — images are written to a directory on disk:

```json
{
  "private": {
    "googleDrive": { "backend": "local", "localPath": "/tmp/umsme-receipts" }
  }
}
```

`fileId` becomes a path relative to `localPath` (`<year>/<filename>`). This is what the checked-in `app/settings.json` and `admin/settings.json` use by default.

### Google Cloud setup (drive backend)

1. In Google Cloud, create a project and **enable the Google Drive API**.
2. Create a **service account**; generate a JSON key and save it to the `keyFile` path (do not commit it).
3. In Google Drive, create (or pick) a **shared drive**, then add the service account's email (`...@...iam.gserviceaccount.com`) as a **member with Content manager** access.
4. Put the shared drive's ID in `sharedDriveId`. The root/year folders are created automatically on first upload.

### How receipts are served

Receipt images are served by an HTTP endpoint (`GET /api/expenses/<id>/receipt?v=<fileId>&t=<token>`) registered in both the app and admin server processes, which streams the bytes from storage with `Content-Type`, `ETag`, and `Cache-Control` so browsers cache them. Admins/treasurer still go through the server (no Google access needed); they never hit Drive directly.

Because an `<img>` request carries no login session, the URL is authorized by a signed token minted by a method only after the normal authz check (the owner in the app, an admin/board/treasurer role in admin). The token is an HMAC keyed by `private.receiptTokenSecret`, scoped to the exact photo version and valid for ~48h. **Set `receiptTokenSecret` in production** (a long random string), and use the **same** value across instances if the app is load-balanced; if unset, a random per-process secret is generated at startup (fine for a single instance/dev, but URLs break on restart and across instances).

nginx must proxy `/api/expenses` to both the app and admin upstreams (it already proxies `/api/certificates` for the admin RFID endpoint).

### Who can submit expenses (`app/settings.json`)

The member-facing expenses feature is gated by an allowlist of member emails:

```json
{
  "private": {
    "expenses": { "allowList": ["treasurer@example.com", "board-member@example.com"] }
  }
}
```

Only listed members see the Expenses entry (Home card + hamburger menu) and may call the expense methods — the server enforces the same list, so it is a real restriction, not just hidden UI. **An absent or empty `allowList` means nobody**: the feature stays disabled until at least one email is configured. Emails are matched against the member's `Members.email`.

The "Open in admin" links in the expense manager events are built from `public.adminUrl` (see below) — both the app's `expenseSubmitted` event and the admin's `expenseConfirmed`/`expenseReimbursed` events use it. If `public.adminUrl` is unset, the message is still sent without a link.

---

## 13. Development Setup

### Prerequisites

- Node.js (version matching the Meteor requirement)
- Meteor 3.1+
- MongoDB (local instance)

### Running the Apps

Each app runs independently from within its own directory:

```bash
# Admin (port 3000)
cd admin/
npm run sigma          # Runs with settings.json

# App (port 3001)
cd app/
npm run dev            # Runs with settings.json on port 3001

# Payment (port 3003)
cd payment/
npm run dev            # Runs with settings.json on port 3003
```

All three apps must point to the same MongoDB instance. In development, Meteor's built-in MongoDB (port 3001) is used by default; for multi-app development, configure `MONGO_URL` to point all apps to the same database.

### Testing

| App     | Command               | Framework              |
|---------|-----------------------|------------------------|
| admin   | `npm test`            | Mocha (meteortesting:mocha) |
| app     | `npm run test:e2e`    | Full-app Mocha tests   |
| payment | `npm test`            | Mocha                  |

### Component Development

The member app includes Storybook for isolated component development:

```bash
cd app/
npm run storybook
```

---

## 14. Deployment

### Building

Each app is built separately using Meteor's build tool:

```bash
cd admin/
meteor build dist --architecture os.linux.x86_64

cd app/
npm run build

cd payment/
npm run build
```

Each build produces a tarball containing a standalone Node.js application.

### Production Requirements

- All three apps must connect to the **same MongoDB instance** in production
- The Payment service must be reachable by Swish at the configured callback URL
- Swish TLS client certificates must be available to the app
- SMTP must be configured for email delivery
- Home Assistant must be reachable from the app server for door lock control
- The umsme-bank proxy service must be running and reachable from the admin server for bank sync

### Environment Variables

| Variable    | App(s)      | Purpose                                  |
|-------------|-------------|------------------------------------------|
| `MONGO_URL` | all         | MongoDB connection string                |
| `MAIL_URL`  | admin       | SMTP connection (e.g. `smtp://user:pass@host:port`) |
| `ROOT_URL`  | all         | Public URL of each app                   |
| `PORT`      | all         | HTTP port (defaults: 3000, 3001, 3003)   |

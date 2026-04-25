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
| `syncNrOfTransactions`| Number of bank transactions to sync          |
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

---

## 3. App Settings

| Key                               | Purpose                                    |
|-----------------------------------|--------------------------------------------|
| `public.swish.disabled`           | Kill switch for Swish payments             |
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
| `serviceConfigurations`           | OAuth credentials (Google, Facebook)       |

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

---

## 10. Push Notification Configuration

VAPID keys must be configured in the app's `settings.json`:

- `Meteor.settings.public.vapidPublicKey` -- used by the client to subscribe
- `Meteor.settings.private.vapidPrivateKey` -- used by the server to sign push messages

If VAPID keys are not configured, the server logs a warning and push notifications are disabled.

---

## 11. Development Setup

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

## 12. Deployment

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

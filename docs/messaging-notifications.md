# Messaging and Notification Systems

UMSME uses two notification channels to communicate with members: **email** (admin-driven, via the admin app) and **push notifications** (automated and app-driven, via the member-facing PWA). The data model includes `sms` fields on templates and messages as preparatory work, but SMS sending is not implemented or tested. A separate **reminder tracking** system in the admin UI helps administrators follow up with members whose memberships are about to expire or have recently expired.

For related documentation see [business-rules.md](business-rules.md) for membership pricing and reminder rules, [auth-and-roles.md](auth-and-roles.md) for admin role requirements, and [architecture.md](architecture.md) for the cron job inventory.

---

## 1. Email System (Admin)

Email is sent from the admin application. See [configuration.md](configuration.md#9-email-configuration) for SMTP and sender address setup.

### Meteor Methods

| Method | Auth | Description |
|--------|------|-------------|
| `mail(to, subject, text, from)` | Admin | Sends a plain-text email. |
| `mailAboutMemberShip(email)` | None (server) | Looks up the member by email, finds the active `status` template, renders it with `messageData()`, and sends the result. |
| `sendVerificationEmail()` | Admin | Triggers Meteor's built-in account verification email for the calling user. |
| `fromOptions()` | None | Returns the list of allowed sender addresses from `Meteor.settings.from` (which can be a string or array), formatted as `{ label, value }` options for the admin UI. |

**Source:** `admin/server/methods/mail.js`

---

## 2. Message Templates

Templates define the content of messages sent to individual members. They are stored in the `MessageTemplates` collection. See [data-model.md](data-model.md) for the full schema.

Templates are selected by matching `type` + `membershiptype` + `membertype` against available non-deprecated templates. The `mailAboutMemberShip()` method uses a simpler lookup: it finds the first non-deprecated template with `type: "status"`.

### Template Variable Substitution

Templates use Underscore.js `_.template()` syntax (e.g. `<%= name %>`) and are rendered by `messageData()` in `common/lib/message.js`. The following variables are available in every template:

| Variable | Source | Description |
|----------|--------|-------------|
| `id` | `member._id` | Member document ID |
| `mid` | `member.mid` | Human-readable member ID |
| `name` | `member.name` | Member's full name |
| `email` | `member.email` | Member's email address |
| `family` | `member.family` | Boolean: family membership |
| `familyMembers` | Computed | Comma-separated names of family members (members with `infamily` pointing to this member) |
| `youth` | `member.youth` | Boolean: youth membership |
| `liability` | `member.liability` | Boolean: has signed liability waiver |
| `memberStartDate` | Computed | Start of current membership period (YYYY-MM-DD) |
| `memberEndDate` | `member.member` | End of membership period (YYYY-MM-DD) |
| `labStartDate` | Computed | Start of current lab period (YYYY-MM-DD) |
| `labEndDate` | `member.lab` | End of lab access period (YYYY-MM-DD) |

When a `membershipId` is provided (e.g. for confirmation messages), additional variables become available:

| Variable | Source | Description |
|----------|--------|-------------|
| `amount` | `membership.amount` | Payment amount |
| `type` | `membership.type` | Membership type (member/lab/labandmember) |
| `discount` | `membership.discount` | Boolean: discounted price applied |
| `startPeriod` | `membership.start` | Membership period start (YYYY-MM-DD) |
| `endMemberPeriod` | `membership.memberend` | Membership end (YYYY-MM-DD) |
| `endLabPeriod` | `membership.labend` | Lab access end (YYYY-MM-DD) |

**Source:** `common/lib/message.js`, `common/lib/models.js`

---

## 3. Individual Messages (Audit Log)

After a templated message is sent to a member, a record is stored in the `Messages` collection for audit purposes, linking back to the template, member, and optionally the membership. See [data-model.md](data-model.md) for the schema.

**Source:** `common/collections/messages.js`

---

## 4. Bulk Mail

Bulk email campaigns are managed through the admin UI and stored in the `Mails` collection. See [data-model.md](data-model.md) for the schema.

Recipient segments determine who receives the mail:

| Segment key | Description |
|-------------|-------------|
| `members` | All members with a current (non-expired) membership |
| `labmembers` | All members with current lab access |
| `yearmembers` | All members who have been members at any point in the current calendar year |
| `recentmembers` | All members who have been members at any point in the last year |

The `family` boolean controls whether family members (those with `infamily` set) are included in or excluded from the recipient list.

**Source:** `common/collections/mails.js`

---

## 5. Push Notifications (App)

The member-facing PWA supports Web Push notifications using the Web Push API with VAPID authentication.

See [configuration.md](configuration.md#10-push-notification-configuration) for VAPID key setup.

### Push Subscription Storage

Subscriptions are stored in the `PushSubs` collection with a unique index on `endpoint`. See [data-model.md](data-model.md) for the schema.

### Meteor Methods

| Method | Auth | Description |
|--------|------|-------------|
| `savePushSubscription(sub)` | Logged in | Registers or updates a browser push subscription. Requires `endpoint`, `keys.p256dh`, and `keys.auth`. If a subscription with the same endpoint exists, it updates the userId and keys. |
| `removePushSubscription(endpoint)` | Logged in | Removes the push subscription for the given endpoint, scoped to the calling user. |
| `updateNotificationPrefs(prefs)` | Logged in | Stores notification preferences on the member document (e.g. `{ membershipExpiry: true }`). |
| `getNotificationPrefs()` | Logged in | Returns the member's notification preferences. Defaults to `{ membershipExpiry: true }` if no preferences are stored or no member is found. |
| `sendTestNotification()` | Admin or admin-locks | Sends a test push to all of the calling user's subscriptions. Includes a 4-second delay before sending. |

### Sending Push Notifications

The `sendPushToSubscriptions(subs, payload)` function (exported from `app/server/methods/push.js`) handles delivery:

1. Serializes the payload to JSON.
2. Iterates over all subscription documents and calls `webpush.sendNotification()` for each.
3. **Auto-cleanup:** If the push service responds with 410 (Gone) or 404 (Not Found), the subscription is automatically removed from the database.
4. Other errors are logged but do not remove the subscription.

### Push Payload Format

All push payloads use a bilingual structure:

```json
{
  "title": { "sv": "Swedish title", "en": "English title" },
  "body": { "sv": "Swedish body", "en": "English body" },
  "category": "membershipExpiry",
  "timestamp": 1717500000000
}
```

Known categories: `membershipExpiry`, `testNotification`.

**Source:** `app/server/methods/push.js`, `common/collections/pushSubs.js`

---

## 6. Service Worker

The service worker (`app/public/service-worker.js`) handles incoming push events on the client side.

### Push Event Handling

1. Parses the push payload as JSON (falls back to plain text for the body).
2. Resolves the user's preferred language from IndexedDB (`settings` store, key `userLanguage`). Defaults to `sv` (Swedish).
3. Selects the appropriate language version of `title` and `body` from the bilingual payload.
4. Stores the notification in IndexedDB (`items` store) with both language versions, so the in-app notifications page can re-render in either language:
   - `id`: timestamp
   - `title`: `{ sv, en }`
   - `body`: `{ sv, en }`
   - `category`: string
   - `timestamp`: number
   - `read`: false
5. Sends a `NEW_NOTIFICATION` message via `BroadcastChannel` (channel name: `notifications`) so the running app can reactively update the UI.
6. Shows a native OS notification via `self.registration.showNotification()` with the localized title and body.

### IndexedDB Schema

Database name: `notifications`, version 1, with two object stores:

| Store | Key | Purpose |
|-------|-----|---------|
| `items` | `id` (timestamp) | Stores received notifications with bilingual content |
| `settings` | `key` | Stores user preferences (e.g. `userLanguage`) |

### Notification Click

When a user clicks a displayed notification, the service worker:
1. Closes the notification.
2. Tries to find an existing app window and navigates it to `/notifications`.
3. If no window is open, opens a new window at `/notifications`.

### Lifecycle

- **Install:** Calls `self.skipWaiting()` to activate immediately.
- **Activate:** Calls `self.clients.claim()` to take control of open pages.
- **Fetch:** Pass-through (no caching strategy; all requests go to the network).

**Source:** `app/public/service-worker.js`

---

## 7. Membership Expiry Notifications (Cron Job)

An automated cron job sends push notifications to members whose memberships are about to expire, are expiring today, or have recently expired.

### Schedule

Runs daily. The time is configured via `Meteor.settings.private.notifyExpiringTime` using text-parser syntax (e.g. `"at 09:00 am"`). Defaults to 9:00 AM. Uses `chatra:synced-cron` to prevent duplicate runs across multiple server instances.

### Notification Types

Defined in `app/private/notifications.json`. Each entry specifies when and to whom the notification is sent:

| Key | `remaining` | `lab` | `family` | Description |
|-----|-------------|-------|----------|-------------|
| `7daysBefore` | 7 | -- | -- | Membership expires in 7 days |
| `dayOf` | 0 | -- | -- | Membership expires today |
| `7daysAfter` | -7 | -- | -- | Membership expired 7 days ago |
| `lab7daysBefore` | 7 | true | -- | Lab access expires in 7 days |
| `labDayOf` | 0 | true | -- | Lab access expires today |
| `lab7daysAfter` | -7 | true | -- | Lab access expired 7 days ago |
| `family7daysBefore` | 7 | -- | true | Family membership expires in 7 days |
| `familyDayOf` | 0 | -- | true | Family membership expires today |
| `family7daysAfter` | -7 | -- | true | Family membership expired 7 days ago |

The `remaining` field represents days until expiry. Positive values mean the membership has not yet expired; negative values mean it has already expired. Zero means the day of expiry.

Family notification bodies tell the member to ask the paying family member to renew, rather than renewing directly.

### Processing Logic

For each member with `notificationPrefs.membershipExpiry` not explicitly set to false:

1. Look up the Meteor user account linked to the member's email.
2. Determine the paying member: if the member has `infamily` set, use that member's dates; otherwise use their own.
3. Compute membership status via `memberStatus()` to get `memberEnd` and `labEnd` dates.
4. Determine whether this is a lab-specific expiry (when `labEnd` differs from `memberEnd`).
5. Iterate over notification types and check:
   - Does `family` match (family member vs. non-family)?
   - Does `lab` match (lab expiry vs. regular membership expiry)?
   - Does `daysBetween(today, endDate)` match the `remaining` value?
6. **Deduplication:** Check `member.lastExpiryNotification`. If the same notification `type` was already sent today, skip.
7. Find all push subscriptions for the user and send the notification.
8. Record `{ date: today, type }` in `member.lastExpiryNotification`.
9. Only one notification type is sent per member per run (breaks after the first match).

### Opt-out

Members can opt out by setting `notificationPrefs.membershipExpiry` to `false` via the `updateNotificationPrefs` method. The cron job's query explicitly filters out members where this is `false`. The default is opt-in (the preference defaults to `true` when not set).

**Source:** `app/server/cronjob/notifyExpiring.js`, `app/private/notifications.json`

---

## 8. Reminder Tracking (Admin)

The admin application includes a reminder tracking system to help administrators identify members who need manual follow-up about expiring memberships. This is separate from the automated push notifications above and is driven entirely by the admin UI.

The `reminderState()` function in `common/lib/rules.js` computes a state for each member: `needed`, `overdue`, `done`, `old`, or `none`. See [business-rules.md](business-rules.md#10-reminder-rules) for the full rules, constants, and evaluation order.

### How It Works

1. An admin views the members list in the admin dashboard, which displays the reminder state for each member.
2. When a member's state is `needed` or `overdue`, the admin manually sends a reminder (using the templated message system).
3. Sending a reminder updates `member.reminder` to the current date, which flips the state to `done`.
4. After 42 days the cooldown expires: if the membership is still expiring/expired, the state reverts to `needed` or `overdue`.

---

## 9. Channel Comparison

| Aspect | Email (Admin) | Push (App) |
|--------|---------------|------------|
| **Trigger** | Manual by admin | Automated cron + manual test |
| **Application** | admin | app |
| **Delivery** | SMTP via `MAIL_URL` | Web Push API (VAPID) |
| **Personalization** | Template variables via `messageData()` | Bilingual title/body from JSON config |
| **Audit trail** | `Messages` collection | `member.lastExpiryNotification` |
| **Opt-out** | N/A | `notificationPrefs.membershipExpiry` |
| **Bulk support** | Yes (`Mails` collection) | No (individual delivery) |


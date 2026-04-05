# Door Access System

## 1. Overview

UMSME has two door access systems:

- **Home Assistant** (current) -- used by the member app (`app/`) to let members unlock doors directly from their phone.
- **Danalock** (legacy) -- managed through the admin app (`admin/`), using cloud-based calendar access control.

Both systems record unlock events in the `Unlocks` collection for auditing. The legacy Danalock system also has a nightly cron job that syncs unlock history and emails a report.

---

## 2. Home Assistant Integration (Current)

**Source:** `app/server/methods/doors.js`

The member app communicates with a Home Assistant instance to trigger door unlocks. See [configuration.md](configuration.md#6-home-assistant-configuration) for the full settings structure.

### Lock Types

The `type` field determines which Home Assistant service endpoint is called:

| Type | API Endpoint | Use Case |
|------|-------------|----------|
| `lock` | `POST /api/services/lock/unlock` | Smart locks (Danalock, Yale, etc.) |
| `switch` | `POST /api/services/switch/turn_on` | Relay switches, electric strikes, gate openers |

### Methods

#### `availableDoors()`

Returns the list of doors the current user is allowed to unlock, along with their locations for geofencing. This method checks prerequisites but does **not** throw on failure -- it returns an empty list instead.

**Returns:** `{ proximityRange: number, doors: Array<{ id, location }> }`

Prerequisite checks (all must pass to return doors):

1. User must be logged in
2. Member must be found via verified email (`findForUser()`)
3. Member must have an active lab membership (lab end date in the future)
4. Member must be registered (formally accepted)

The method intentionally does **not** check liability documents or certificates -- those are checked only at unlock time. This means the UI can show available doors and prompt the user to complete missing prerequisites before they attempt to unlock.

#### `unlockDoor(lockId)`

Validates all prerequisites, then calls the Home Assistant API to unlock the specified door.

**Parameters:** `lockId` (string) -- must match a configured lock's `id`

**Returns:** `{ success: true, message: "Lock <id> unlocked" }`

**Throws** on any prerequisite failure (see next section).

### Geofencing

The `proximityRange` value (in meters) and each lock's `location` are returned by `availableDoors()`. The **client app** performs the proximity check -- the server does not enforce geofencing. The app uses the device's GPS to determine whether the user is within `proximityRange` meters of the door before enabling the unlock button.

If a lock has no `location`, geofencing is not applied and the unlock button is always enabled (assuming prerequisites pass).

---

## 3. Unlock Prerequisites

**Source:** `app/server/methods/doors.js` (lines 56-103), `app/server/methods/utils.js`

The `unlockDoor()` method enforces the following checks in order. A failure at any step throws a `Meteor.Error` and aborts. This is the most common thing to debug when a member cannot unlock a door.

### 1. Authenticated user

The user must be logged in (`Meteor.userId()` must be set).

**Error:** `not-authorized` -- "You must be logged in"

### 2. Valid lock ID

The `lockId` must match a configured lock's `id` field.

**Error:** `invalid-lock` -- "Invalid lock ID"

### 3. Active lab membership

The member must have a lab membership with an end date in the future. For family members, the **paying member's** lab end date is checked (via `member.infamily` lookup).

The check uses `hasActiveLabMembership()` which calls `memberStatus()` from `common/lib/utils.js` to compute the effective lab end date.

**Error:** `not-authorized` -- "No active lab membership"

See: [business-rules.md](business-rules.md) for lab membership duration and pricing rules.

### 4. Registered member

The member must have `registered: true` on their Member record (or on the paying member's record for family members). A member is registered when an admin formally accepts them.

**Error:** `not-registered` -- "Your membership has not been accepted yet"

### 5. Approved latest liability document

The member's `liabilityDate` field must exactly match the `date` field of the most recent `LiabilityDocument`. This is a timestamp equality check -- if a new liability document is uploaded, all previous approvals are implicitly invalidated because the dates will no longer match.

**Error:** `liability-not-approved` -- "You must approve the latest liability agreement"

### 6. Valid mandatory certificate

If any `Certificate` document has `mandatory: true`, the member must have a confirmed `Attestation` for it. The attestation must:

- Reference the mandatory certificate's `_id` via `certificateId`
- Reference the member's `_id` via `memberId`
- Have a `certifierId` set (meaning a certifier has confirmed it, not just self-registered)
- **Not be expired** -- if `endDate` is set, it must be in the future

**Error:** `mandatory-certificate-missing` -- "You must have the mandatory certificate" (with the certificate `_id` as details)

**Error:** `mandatory-certificate-expired` -- "Your mandatory certificate has expired" (with the certificate `_id` as details)

See: [certificates.md](certificates.md) for how certificates and attestations work.

### Prerequisite Summary

```
unlockDoor(lockId)
  |
  +-- Logged in?                          --> not-authorized
  +-- Lock ID valid?                      --> invalid-lock
  +-- findForUser() -> member
  +-- hasActiveLabMembership(member)?      --> not-authorized
  +-- isMemberRegistered(member)?          --> not-registered
  +-- Latest liability approved?           --> liability-not-approved
  +-- Mandatory certificate confirmed?     --> mandatory-certificate-missing
  +-- Mandatory certificate not expired?   --> mandatory-certificate-expired
  |
  +-- POST Home Assistant API
  +-- Return { success: true }
```

---

## 4. Liability Documents

**Source:** `app/server/methods/liabilityDocuments.js`, `common/collections/liabilityDocuments.js`, `common/lib/models.js`

Liability documents are versioned multilingual waivers that members must approve before they can unlock doors.

See [data-model.md](data-model.md) for the full `LiabilityDocuments` schema. The key field is `date`, which serves as the version identifier for approval matching.

### Lifecycle

1. An admin uploads a new liability document via the admin app. It gets a new `date` value.
2. Because the door unlock check compares `member.liabilityDate` to the latest document's `date`, all existing member approvals are **implicitly invalidated** when a new document is uploaded -- no bulk update is needed.
3. Members see a prompt in the app to review and approve the new document.
4. On approval, `approveLiability(date)` sets `member.liabilityDate = document.date`.
5. The next `unlockDoor()` call succeeds because `member.liabilityDate` now matches the latest document's date.

### App Methods

| Method | Description |
|--------|-------------|
| `liabilityDocumentsList()` | Returns all documents with `title` and `date` only (sorted newest first) |
| `liabilityDocumentByDate(date)` | Fetches a single document by its date, including the full `text` |
| `approveLiability(date)` | Sets `member.liabilityDate` to the document's date |

See: [data-model.md](data-model.md) for the full Member schema including `liabilityDate`.

---

## 5. Legacy Danalock Integration

**Source:** `admin/server/methods/lock.js`

The legacy system uses the Danalock cloud API with OAuth2 authentication and calendar-based access control. It is managed entirely through the admin app.

See [configuration.md](configuration.md#7-danalock-configuration-legacy) for the required settings.

### Authentication

`authenticate()` performs OAuth2 password-grant authentication against `https://api.danalock.com/oauth2/token`. The token is cached for 1 hour (3,600,000 ms). On authentication:

1. Obtains an access token via password grant with client ID `danalock-web`
2. Fetches user identities and finds the assumed user (matching `lockAssumeUser`)
3. Constructs request headers with `Authorization` and `X-Assume-User`
4. Resolves the lock ID by matching `lockName` against available locks
5. Resolves the group ID by matching `groupLockName` against available groups

### Methods

All methods require admin role.

| Method | Description |
|--------|-------------|
| `syncLockHistory` | Fetches the latest 50 log entries from Danalock and inserts new ones into `Unlocks` |
| `syncAndMailLockHistory` | Syncs history, then emails the last ~25 hours of unlocks |
| `lockHistory` | Fetches up to 6 months of lock log entries (paginated, 50 per page) |
| `lockStatus` | Returns all Danalock users, calendars, and group-user links (2 pages each) |
| `setCalenderEndDate(calendar, endDate, link)` | Updates a user's calendar end date (creates new calendar, updates link, deletes old calendar) |
| `createCalendarEndDate(userid, endDate)` | Creates a new calendar with an end date and links it to a user |

### Calendar-Based Access Control

Danalock uses calendar objects to control when a user can operate the lock. Each calendar has rule sets with start/end times. Access control works as follows:

1. A **calendar** defines the time window (start time, end date, optionally day-of-week rules)
2. A **group-user link** connects a user to a group (the lock group) via a calendar
3. To grant access: create a calendar with the desired end date, then link it to the user
4. To update access: create a new calendar, update the link to point to it, delete the old calendar

### Lock User Status Values

The admin UI tracks lock user status with these values (stored in the `lockusers` collection):

| Status | Meaning |
|--------|---------|
| `noaccount` | Member has no Danalock account |
| `invited` | Invitation sent but not yet accepted |
| `wrong` | Account exists but configuration is incorrect |
| `correct` | Account properly configured with correct end date |
| `forever` | Account has no end date (permanent access) |
| `admin` | User has administrator privileges on the lock |
| `old` | Old/inactive account |

---

## 6. Unlock Audit Log

**Source:** `common/collections/unlocks.js`, `common/lib/models.js`

The `Unlocks` collection records all door unlock events for auditing purposes. See [data-model.md](data-model.md) for the schema.

### Sync from Danalock

The `syncUnlocks()` function fetches the 50 most recent log entries from the Danalock API and inserts any that do not already exist (deduplication is by exact `timestamp` match). Usernames are cleaned by truncating at the last colon.

---

## 7. Nightly Sync and Report

**Source:** `admin/server/cronjob/syncAndMailUnlocks.js`

A scheduled job runs in the admin app to sync Danalock unlock history and send an email report.

### Schedule

Runs daily at **3:00 AM** server time, managed by `chatra:synced-cron`.

### What It Does

1. Authenticates with the Danalock API
2. Calls `syncUnlocks()` to import new unlock events into the `Unlocks` collection
3. Queries all unlocks from the past ~23 hours (`yesterday.setHours(-23)` relative to now)
4. Sends an email report to two recipients:
   - `pass@ekebyindustrihus.com` (building management)
   - `mpalmer@gmail.com` (UMS admin)

### Email Format

- **From:** `kansliet@uppsalamakerspace.se`
- **Subject:** "Lasoppningar UMS" (Swedish: "Lock openings UMS")
- **Body:** Count of unlocks and a line-per-unlock log with ISO timestamp and user ID

Example:

```
3 lasoppningar av ytterdorren fran 2026-04-04T01:00:00.000Z till 2026-04-05T03:00:00.000Z

2026-04-04T08:15:22.000Z user-ea5a1fcc5fe4
2026-04-04T14:30:01.000Z user-0366ba845fb5
2026-04-04T19:45:33.000Z user-ea5a1fcc5fe4
```

---

## Related Documentation

- [certificates.md](certificates.md) -- Mandatory certificates and attestation system
- [business-rules.md](business-rules.md) -- Lab membership types, pricing, and duration
- [data-model.md](data-model.md) -- Full collection schemas including Member fields like `liabilityDate` and `registered`

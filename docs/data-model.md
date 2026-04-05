# Data Model Reference

Comprehensive documentation of all MongoDB collections in the UMSME system.

---

## 1. Entity Relationship Overview

```
                           +----------------+
                           | MessageTemplate|
                           |  (templates)   |
                           +-------+--------+
                                   |
                           template|ref
                                   v
+----------+   email    +----------+--------+     1:N      +------------+
|  Users   |----------->|       Members     |<------------>|  Comments  |
| (users)  |  (lookup)  |     (members)     |    about     | (comments) |
+----------+            +---+---+---+---+---+              +------------+
                            |   |   |   |
              infamily      |   |   |   |  mid
           (self-ref) ------+   |   |   +------------+
                                |   |                |
                          mid   |   | member         v
                                |   |       +--------+-------+
                                |   |       |  Memberships   |
                                |   |       |  (membership)  |
                                |   |       +--------+-------+
                                |   |                |
                                |   |           pid  |
                                |   |                v
                                |   |       +--------+-------+
                                |   +------>|    Payments    |
                                |           |   (payments)   |
                                |           +----------------+
                                |
                     memberId   |
                +---------------+---------------+
                |               |               |
                v               v               v
        +-------+------+ +-----+------+ +------+------+
        | Attestations | |  Messages  | |   Unlocks   |
        |(attestations)| | (messages) | |  (unlocks)  |
        +-------+------+ +------------+ +-------------+
                |
        certId  |
                v
        +-------+------+
        | Certificates |
        |(certificates)|
        +---+----------+
            |
            | prerequisites (self-ref)
            +---> Certificates

        +----------------+    +----------------+    +----------------+
        |     Mails      |    |    Invites     |    |   PushSubs     |
        |    (mails)     |    |   (invites)    |    |  (pushSubs)    |
        +----------------+    +----------------+    +----------------+

        +----------------+    +--------------------+
        |   Liability    |    | InitiatedPayments  |
        |   Documents    |    | (initiatedPayments)|
        +----------------+    +--------------------+
```

### Relationship summary

| From | To | Cardinality | Link field |
|------|----|-------------|------------|
| Member | Memberships | 1:N | `Membership.mid` = `Member._id` |
| Member | Payments | 1:N | `Payment.member` = `Member._id` |
| Member | Attestations | 1:N | `Attestation.memberId` = `Member._id` |
| Member | Messages | 1:N | `Message.member` = `Member._id` |
| Member | Comments | 1:N | `Comment.about` = `Member._id` |
| Member | Member (family) | N:1 | `Member.infamily` = paying `Member._id` |
| User | Member | 1:1 | Linked by matching email address |
| Membership | Payment | N:1 | `Membership.pid` = `Payment._id` |
| Certificate | Attestations | 1:N | `Attestation.certificateId` = `Certificate._id` |
| Certificate | Certificate (prereqs) | N:N | `Certificate.prerequisites[]` = `Certificate._id` |
| MessageTemplate | Messages | 1:N | `Message.template` = `MessageTemplate._id` |
| Invite | Member (family) | N:1 | `Invite.infamily` = `Member._id` |

---

## 2. Collection Reference

### Members (`members`)

The central entity representing a makerspace member.

| Field | Type | Description |
|-------|------|-------------|
| `_id` | String | Mongo-generated ID |
| `mid` | String (max 10) | Human-readable member ID (auto-generated) |
| `name` | String (max 200) | Full name |
| `email` | String (max 200) | Email address (links to Users collection) |
| `mobile` | String (max 20) | Phone number |
| `birthyear` | Number | Year of birth |
| `gender` | String | `male`, `female`, or `undisclosed` |
| `rfid` | String (max 20) | RFID tag hex string for physical access |
| `member` | Date | **Denormalized**: membership expiry date (derived from Memberships) |
| `lab` | Date | **Denormalized**: lab membership expiry date (derived from Memberships) |
| `family` | Boolean | **Denormalized**: whether current membership is a family plan |
| `infamily` | String (max 50) | `_id` of the paying family member (see [Family Membership Pattern](#4-family-membership-pattern)) |
| `youth` | Boolean | Whether this is a youth member |
| `lock` | String | Lock system identifier |
| `liability` | Boolean | Whether the member has accepted the liability document |
| `liabilityDate` | Date | Timestamp of the liability document version accepted |
| `reminder` | Date | When the last reminder was sent |
| `registered` | Boolean | Whether the member has created a user account |
| `storage` | Number | Assigned storage box number |
| `storagequeue` | Boolean | Whether the member is in the storage queue |
| `storagerequest` | String (max 30) | Location preference for storage (see [Storage](#5-storage)) |
| `paymentError` | String (max 50) | Last payment error message |
| `notificationPrefs` | Object (blackbox) | Push notification preferences |
| `lastExpiryNotification` | Object (blackbox) | Tracks last expiry notification sent |

**Relationships**: One-to-many with Memberships, Payments, Attestations, Messages, and Comments. Self-referencing via `infamily`.

---

### Memberships (`membership`)

A single membership period purchased by or assigned to a member.

| Field | Type | Description |
|-------|------|-------------|
| `mid` | String (max 50) | References `Member._id` |
| `pid` | String (max 50) | References `Payment._id` (optional) |
| `type` | String (max 30) | `member`, `lab`, or `labandmember` |
| `start` | Date | Period start date |
| `memberend` | Date | Membership component expiry (optional for `lab` type) |
| `labend` | Date | Lab component expiry (optional for `member` type) |
| `amount` | Number | Amount paid |
| `discount` | Boolean | Whether a discount was applied |
| `family` | Boolean | Whether this is a family membership |

**Note**: The MongoDB collection name is `membership` (singular), not `memberships`.

---

### Payments (`payments`)

An incoming payment record, typically from bankgiro or Swish.

| Field | Type | Description |
|-------|------|-------------|
| `hash` | String (max 40) | Deduplication hash |
| `type` | String (max 20) | `bankgiro` or `swish` |
| `amount` | Number | Payment amount in SEK |
| `date` | Date | Payment date |
| `message` | String (max 200) | Payment message/reference |
| `name` | String (max 200) | Payer name |
| `mobile` | String (max 20) | Payer phone number (Swish) |
| `member` | String (max 20) | References `Member._id` (set when matched) |
| `membership` | String (max 20) | References `Membership._id` (set when processed) |
| `other` | Boolean | Flagged as non-membership payment |
| `clarification` | String (max 200) | Admin note explaining the payment |
| `externalId` | String (max 40) | External system reference (e.g., Swish payment ID) |
| `initiatedBy` | String (max 20) | References `Member._id` of who initiated the payment |

---

### InitiatedPayments (`initiatedPayments`)

Tracks payment attempts initiated through the app (e.g., Swish flow) before they are confirmed.

| Field | Type | Description |
|-------|------|-------------|
| `externalId` | String | External payment reference |
| `member` | String (max 20) | References `Member._id` |
| `status` | String | Current status of the payment attempt |
| `amount` | String | Amount |
| `createdAt` | Date | When the payment was initiated |
| `resolvedAt` | Date | When the payment was resolved (optional) |
| `paymentType` | String | Type of payment being made |
| `errorCode` | String (max 20) | Error code if failed |
| `errorMessage` | String (max 200) | Error description if failed |

---

### Users (`users`)

Meteor's built-in `Meteor.users` collection. Not a custom collection -- uses the standard Meteor accounts system with OAuth support (Google, Facebook).

| Field | Type | Description |
|-------|------|-------------|
| `username` | String (max 50) | Username (optional) |
| `emails` | Array of Objects | Email addresses |
| `emails.$.address` | String (max 80) | Email address |
| `emails.$.verified` | Boolean | Whether the email is verified |

**Linking to Members**: There is no explicit foreign key. Users are linked to Members by matching email address. A User's `emails.$.address` corresponds to `Member.email`.

---

### Certificates (`certificates`)

Defines a type of certification that members can earn (e.g., safety training, machine operation).

| Field | Type | Description |
|-------|------|-------------|
| `name` | Object | Localized name: `{ sv: "...", en: "..." }` |
| `description` | Object | Localized description: `{ sv: "...", en: "..." }` |
| `defaultValidityDays` | Number | How long an attestation is valid (optional -- unlimited if not set) |
| `prerequisites` | Array of String | `_id` references to other Certificates that must be held first |
| `certifiers` | Array of String | `_id` references to Members who can grant this certificate |
| `certifierRole` | String (max 100) | Meteor role that grants certifier access |
| `mandatory` | Boolean | If true, this certificate is required for membership. Only one certificate can be mandatory at a time (enforced by deny rules). |

**Deny rules**: Mandatory certificates cannot be deleted. The mandatory flag cannot be removed, and a second certificate cannot be marked mandatory while one already exists.

---

### Attestations (`attestations`)

A record that a specific member holds a specific certificate.

| Field | Type | Description |
|-------|------|-------------|
| `certificateId` | String (max 50) | References `Certificate._id` |
| `memberId` | String (max 50) | References `Member._id` |
| `certifierId` | String (max 50) | References `Member._id` of the person who granted it |
| `startDate` | Date | When the attestation was granted |
| `endDate` | Date | When it expires (optional -- based on `Certificate.defaultValidityDays`) |
| `comment` | String (max 1000) | Visible comment |
| `privateComment` | String (max 1000) | Admin-only comment |
| `attempt` | Number | Attempt number (for tracking retakes) |
| `confirmedAt` | Date | When the member confirmed/acknowledged the attestation |

---

### Messages (`messages`)

Individual emails sent to specific members (welcome messages, confirmations, reminders).

| Field | Type | Description |
|-------|------|-------------|
| `template` | String (max 20) | References `MessageTemplate._id` |
| `member` | String (max 20) | References `Member._id` |
| `membership` | String (max 20) | References `Membership._id` (optional) |
| `type` | String (max 20) | `welcome`, `confirmation`, `reminder`, or `status` |
| `to` | String (max 200) | Recipient email address |
| `subject` | String (max 200) | Email subject |
| `senddate` | Date | When the message was sent |
| `messagetext` | String (max 10000) | Email body |
| `sms` | String (max 140) | Optional SMS text |

---

### Mails (`mails`)

Bulk email campaigns sent to groups of members.

| Field | Type | Description |
|-------|------|-------------|
| `from` | String (max 50) | Sender address |
| `recipients` | String (max 20) | Target group: `members`, `labmembers`, `yearmembers`, or `recentmembers` |
| `family` | Boolean | Whether to include family members |
| `to` | Array of String | Resolved recipient email addresses |
| `failed` | Array of String | Email addresses that failed delivery |
| `subject` | String (max 200) | Email subject |
| `senddate` | Date | When the mail was sent |
| `template` | String (max 10000) | Email body text |
| `sms` | String (max 140) | Optional SMS text |

**Note**: Unlike Messages, Mails are not linked to individual members. They store the full recipient list in the `to` array.

---

### MessageTemplates (`templates`)

Reusable templates for member communications. Selected based on message type, membership type, and member type.

| Field | Type | Description |
|-------|------|-------------|
| `name` | String (max 50) | Template name |
| `type` | String (max 15) | `welcome`, `confirmation`, `reminder`, or `status` |
| `membershiptype` | String (max 15) | `member`, `lab`, or `labandmember` |
| `membertype` | String (max 15) | `normal`, `family`, or `youth` |
| `subject` | String (max 100) | Email subject template |
| `messagetext` | String (max 10000) | Email body template |
| `sms` | String (max 140) | Optional SMS template |
| `deprecated` | Boolean | Whether the template is retired |
| `created` | Date | Creation timestamp |
| `modified` | Date | Last modification timestamp |

**Template selection**: Templates are matched by the combination of `type` + `membershiptype` + `membertype` to select the right template for each situation.

---

### Comments (`comments`)

Free-text admin comments attached to members.

| Field | Type | Description |
|-------|------|-------------|
| `text` | String (max 2000) | Comment body |
| `created` | Date | Creation timestamp |
| `modified` | Date | Last edit timestamp (optional) |
| `about` | String (max 20) | References `Member._id` |

---

### Unlocks (`unlocks`)

Door access log entries from the lock system.

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | Date | When the unlock occurred |
| `username` | String (max 50) | Lock system username |
| `user` | String (max 25) | Lock system user ID |

**Note**: Unlocks are not directly linked to Members by a foreign key. The `username` field corresponds to the lock system's own user database.

---

### PushSubs (`pushSubs`)

Web push notification subscriptions. No schema validation (no SimpleSchema attached).

| Field | Type | Description |
|-------|------|-------------|
| `endpoint` | String | Push service endpoint URL (unique index) |

Additional fields from the browser's PushSubscription object are stored as a blackbox (keys, auth, etc.).

---

### LiabilityDocuments (`liabilityDocuments`)

Versioned liability/waiver documents that members must accept.

| Field | Type | Description |
|-------|------|-------------|
| `title` | String (max 200) | Document title |
| `date` | Date | Version date |
| `text` | Object | Localized text: `{ sv: "...", en: "..." }` (max 50000 chars each) |

**Usage**: When a member accepts the liability document, `Member.liability` is set to `true` and `Member.liabilityDate` is set to the document's `date`, linking the acceptance to a specific version.

---

### Invites (`invites`)

Invitations for family membership. No schema validation attached (simple collection).

| Field | Type | Description |
|-------|------|-------------|
| `email` | String (max 200) | Email of the person being invited |
| `infamily` | String (max 50) | `_id` of the paying family member issuing the invite |

**Lifecycle**: An invite is created when a paying family member invites someone. When the invited person registers, their `Member.infamily` is set to the inviter's `_id` and the invite is consumed.

---

## 3. Denormalization Strategy

The `Members` collection contains three fields that are **derived from Memberships** and cached directly on the member document for query performance:

| Cached field | Source |
|--------------|--------|
| `member` (Date) | Latest `memberend` across all Memberships for this member |
| `lab` (Date) | Latest `labend` across all Memberships for this member |
| `family` (Boolean) | Whether the latest active membership has `family: true` |

These fields allow the system to query member status without joining to the Memberships collection -- critical for list views and filtering in the admin dashboard.

### Reconciliation

The `updateMember()` function in `common/lib/utils.js` is the single reconciliation point:

1. Calls `memberStatus()` to compute the canonical `memberEnd`, `labEnd`, and `family` values from all Memberships for a member.
2. Updates the Member document: sets `member`, `lab`, and `family` if they have values; unsets them if they are undefined.

`updateMember()` should be called after any operation that creates, modifies, or deletes a Membership. The Memberships collection is always the source of truth.

### memberStatus()

The `memberStatus()` function (`common/lib/utils.js`) iterates all Memberships for a given member (or their family payer) and returns:

- `memberEnd` / `memberStart` -- latest membership period boundaries
- `labEnd` / `labStart` -- latest lab period boundaries
- `family` -- whether the active membership is a family plan
- `type` -- current effective type: `labandmember`, `lab`, `member`, or `none`
- `discounted` -- whether the active period has a discount
- `quarterly` -- whether the active lab is a quarterly plan

---

## 4. Family Membership Pattern

Family membership allows one paying member to cover additional family members.

### How it works

1. **Paying member** purchases a family-type membership (`familyBase`, `familyLab`). Their Membership record has `family: true`.
2. **Family members** have their `Member.infamily` field set to the paying member's `_id`.
3. When calculating status for a family member, `memberStatus()` **follows the `infamily` reference**: it resolves `mid = mb.infamily || mb._id` and looks up Memberships using the paying member's `_id`.

This means family members do not have their own Memberships. Their membership validity is entirely derived from the paying member's records.

### Invites

Family members are added via the Invites collection. The paying member creates an invite with the family member's email. When the invited person registers or is matched, their `infamily` field is set.

### Denormalized fields on family members

Even though family members derive their status from the payer, their `member`, `lab`, and `family` cached fields are updated by `updateMember()` so they can be queried independently.

---

## 5. Storage

Members can request and be assigned physical storage boxes at the makerspace.

| Field | Type | Description |
|-------|------|-------------|
| `storage` | Number | Assigned box number (set by admin) |
| `storagequeue` | Boolean | Whether the member is waiting for a box |
| `storagerequest` | String | Location preference (see options below) |

### Storage request options

| Value | Label |
|-------|-------|
| `floor1` | Floor 1 - anywhere |
| `floor2` | Floor 2 - anywhere |
| `floor1L` | Floor 1 - bottom shelf |
| `floor1U` | Floor 1 - upper shelf |
| `floor2L` | Floor 2 - bottom shelf |
| `floor2U` | Floor 2 - upper shelf |
| `none` | No box needed |

**Flow**: A member sets `storagerequest` with their preference and `storagequeue = true`. An admin assigns a box number in `storage` and clears the queue flag.

---

## 6. Key Enums

### Membership types (`Membership.type`)

| Value | Description |
|-------|-------------|
| `member` | Basic association membership |
| `lab` | Lab access only (quarterly, requires existing membership) |
| `labandmember` | Combined membership + lab access |

See [business-rules.md](business-rules.md) for membership pricing details and duration calculations.

### Payment types (`Payment.type`)

| Value | Description |
|-------|-------------|
| `bankgiro` | Bank transfer via bankgiro |
| `swish` | Swedish mobile payment (Swish) |

### Message types (`Message.type`, `MessageTemplate.type`)

| Value | Description |
|-------|-------------|
| `welcome` | Welcome message for new members |
| `confirmation` | Payment/membership confirmation |
| `reminder` | Membership expiry reminder |
| `status` | Status update |

### Recipient types for bulk mail (`Mails.recipients`)

| Value | Description |
|-------|-------------|
| `members` | Currently active members (`member` date in the future) |
| `labmembers` | Currently active lab members (`lab` date in the future) |
| `yearmembers` | Members who have been active at any point during the current year |
| `recentmembers` | Members who have been active within the last year |

### Template member types (`MessageTemplate.membertype`)

| Value | Description |
|-------|-------------|
| `normal` | Standard member |
| `family` | Family plan member |
| `youth` | Youth member |

### Gender (`Member.gender`)

| Value | Description |
|-------|-------------|
| `male` | Male |
| `female` | Female |
| `undisclosed` | Prefer not to say |

### Lock status (admin view, not persisted on Members)

Used in the admin lock-user management view:

| Value | Description |
|-------|-------------|
| `noaccount` | No lock system account |
| `invited` | Invited to lock system |
| `wrong` | Lock account has incorrect settings |
| `correct` | Lock account is properly configured |
| `forever` | Lock access has no end date set |
| `admin` | Lock system admin account |
| `old` | Legacy/deactivated account |

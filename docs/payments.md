# Payment Infrastructure

## 1. Overview

UMSME processes payments through two channels:

- **Swish** (member-initiated) -- Members pay via the Swedish mobile payment system directly from the app. This is the primary, automated flow.
- **Bankgiro** (admin-driven) -- An administrator synchronizes bank transactions from Swedbank and manually matches them to members. This is a legacy/fallback flow.

Both channels ultimately produce **Payment** and **Membership** records in the shared MongoDB database. The member's denormalized date fields (`member`, `lab`, `family`) are updated to reflect the new membership.

### Applications involved

| Application | Role | Port |
|---|---|---|
| **app** | Member-facing PWA; initiates Swish payments | 3001 |
| **payment** | Receives Swish callbacks; processes payments into memberships | 3003 |
| **admin** | Administrator dashboard; bankgiro sync and manual payment matching | 3000 |

All three connect to the same MongoDB instance and share collections via the `common/` symlink.


## 2. Swish Payment Flow (Primary)

The Swish flow is fully automated. Once a member completes payment in the Swish app, the system creates a Membership without admin intervention.

```
  Member App (3001)                Swish API               Payment Service (3003)
  ================                =========               ======================

  1. Select membership type
     |
  2. Call payment.initiate()
     |---> Validate member status
     |---> Create InitiatedPayment (INITIATED)
     |---> PUT /swish/.../paymentrequests/{externalId}
     |          |
     |     <--- 201 + paymentrequesttoken
     |
  3. Display QR code / deep link
     |          |
     |     4. Member pays in Swish app
     |          |
     |     5. POST /swish/callback --------------------------->|
     |                                                         |
     |                                    6. Process callback
     |                                       Look up InitiatedPayment
     |                                       Create Payment (addPayment)
     |                                       Create Membership (processPayment)
     |                                       Update member denormalized fields
     |                                       Return 200 to Swish
     |
  7. Poll payment.getStatus()
     |---> Check InitiatedPayment status
     |<--- PAID → show confirmation
```

### Step-by-step

1. **Member selects membership type** in the app UI. Available types are loaded from `app/private/paymentOptions.json` via the `payment.getOptions` method.

2. **App calls `payment.initiate(paymentType, expectedStatus)`** (`app/server/methods/payments.js`):
   - Validates that `paymentType` matches a known option from `paymentOptions.json`.
   - Checks that Swish is not disabled (`settings.public.swish.disabled`).
   - Finds the member record for the logged-in user via `findMemberForUser()`.
   - **Status guard**: If `expectedStatus` is provided, compares the client's view of `memberEnd`/`labEnd` against the server's current values (from `memberStatus()`). Throws `status-changed` if they differ. This prevents race conditions where the member's status changes between page load and payment initiation.
   - Generates `externalId` -- a UUID (uppercase, no dashes) used as the Swish payment request ID.
   - Creates an `InitiatedPayment` record with status `INITIATED`.
   - Sends a `PUT` request to the Swish API (`{config.api.paymentRequest}/{externalId}`) with the payment amount, callback URL, payee alias, currency (SEK), and a sanitized message containing the payment type and member info.
   - Returns `{ paymentrequesttoken, externalId, amount }` to the client.

3. **Member completes payment** in the Swish app, either by scanning the QR code (generated via `payment.getQrCode(token)`) or via app-switch on mobile.

4. **Swish sends a POST** to `/swish/callback` on the payment service (port 3003). The callback body contains `id` (which matches the `externalId`), `status`, `datePaid`, `amount`, `payerAlias`, `message`, and `paymentReference`.

5. **The payment service validates the callback** (`payment/server/api/swish.js`):
   - Validates the request (POST method, valid JSON body).
   - Optionally validates `callbackIdentifier` if `settings.swish.expectedCallbackIdentifier` is configured.
   - Looks up the `InitiatedPayment` by `externalId`.
   - Dispatches to `handlePaidStatus()` or `handleFailedStatus()` based on the callback `status`.
   - Always returns HTTP 200 to Swish to prevent retries, even on internal errors (which return 500).

6. **The payment service processes the result**:
   - **For PAID** (`handlePaidStatus`):
     - **Idempotency check**: If the InitiatedPayment is already `PAID`, skips processing.
     - **Orphan handling**: If no InitiatedPayment is found, creates an orphan payment (see Section 6).
     - Updates `InitiatedPayment.status` to `PAID` with `resolvedAt`.
     - Calls `addPayment()` to create the Payment record.
     - Calls `processPayment()` to create the Membership and update the member.
   - **For ERROR/CANCELLED/DECLINED** (`handleFailedStatus`):
     - Updates the `InitiatedPayment` with the failure status, `errorCode`, and `errorMessage`.
     - No Payment or Membership records are created.

7. **App polls `payment.getStatus(externalId)`** to detect completion. Returns the `InitiatedPayment` status, amount, paymentType, timestamps, and any error.


## 3. Bankgiro Payment Flow (Admin-driven)

The bankgiro flow is admin-initiated and involves manual matching of bank transactions to members.

```
  Admin App (3000)             umsme-bank proxy            Swedbank
  ================             ================            ========

  1. Admin enters PNR (setPnr)
  2. Admin calls initiateBank
     |---> initiate.php?pnr=... -----> BankID auth
     |<--- Session cookie
  3. Admin calls synchronize
     |---> transactions.php ---------> Fetch transactions
     |<--- Transaction list
     |
  4. For each new transaction (deduplicated by hash):
     |---> transaction.php?id=... ---> Fetch details (Swish: name, number)
     |---> Insert Payment record
     |
  5. Admin manually matches unmatched payments to members in UI
```

### Key functions (`admin/server/methods/bank.js`)

- **`setPnr(pnr)`** -- Stores the admin's personal number for BankID authentication.
- **`clearSession()`** -- Clears the stored PHP session.
- **`checkBank()`** -- Checks if the bank session is active.
- **`initiateBank()`** -- Initiates BankID authentication via the proxy.
- **`synchronize()`** -- The main sync function:
  1. Fetches transactions from `{bankproxy}transactions.php`.
  2. Filters to only "Insattning" (deposit) transactions.
  3. Extracts transaction data, computing a deduplication hash from amount, date, and either accounting balance or bank reference (for newer Swish transactions after `settings.newBankHashDate`).
  4. For each transaction not already in the database (by hash):
     - If Swish: fetches additional details (payer name, sender number, message) from the individual transaction endpoint.
     - Inserts a new Payment record with type `swish` or `bankgiro`.
  5. Returns `{ added, total }` counts.

### Bankgiro deduplication hash

The hash algorithm changed over time. For transactions before `settings.newBankHashDate`:

```
hash = `${amount}${date}${accountingBalance}` (stripped of whitespace, dashes, dots, commas)
```

For Swish transactions after `settings.newBankHashDate`:

```
hash = `${amount}${date}${bankReference}` (stripped of whitespace, dashes, dots, commas)
```

### Manual matching

After synchronization, unmatched payments appear in the admin UI. The admin manually assigns each payment to a member, which triggers membership creation using the legacy `membershipFromPayment()` function in `common/lib/rules.js`. That function is amount-based -- it determines the membership type and duration from the payment amount alone. See [business-rules.md](business-rules.md#12-legacy-amount-based-rules) for the full amount mapping table.


## 4. Why Payment is a Separate App

The payment callback service (`payment/`, port 3003) is isolated from the member-facing app (`app/`, port 3001) for reliability:

- The Swish callback endpoint must be available and responsive at all times. If the member app crashes, goes through a deployment, or experiences high load, the callback service continues to function independently.
- The payment service is minimal -- it has no UI, no client code, and no complex dependencies. This minimizes the attack surface and failure modes.
- Both apps connect to the same MongoDB database, so payment records created by the callback service are immediately visible to the member app and admin dashboard.


## 5. InitiatedPayment Lifecycle

The `InitiatedPayment` collection tracks the lifecycle of Swish payment requests from initiation through resolution. See [data-model.md](data-model.md) for the full schema.

### State diagram

```
                  +---> PAID
                  |
  INITIATED ------+---> ERROR
                  |
                  +---> CANCELLED
                  |
                  +---> DECLINED
                  |
                  +---> EXPIRED  (via cron job)
```

All transitions are one-way. Once an `InitiatedPayment` leaves the `INITIATED` state, it is never updated again (except for the idempotency check that skips already-PAID records).

### Expiration cron job

Stale `INITIATED` payments are expired by a background job (`payment/server/cronjob/expireInitiatedPayments.js`). This handles cases where the member abandons the payment flow.

Configuration is via `Meteor.settings.expireInitiatedPayments`, an array of objects:

```json
[
  {
    "paymentType": "swish",
    "expiry": 360,
    "recurrence": 60
  }
]
```

- `paymentType` -- Which payment type to target.
- `expiry` -- Seconds after `createdAt` before marking as `EXPIRED`.
- `recurrence` -- How often the cron job runs (in seconds).

The job uses `SyncedCron` (from `chatra:synced-cron`) and updates all matching records in a single bulk operation.


## 6. Orphan Payments

When a Swish callback arrives with status `PAID` but no matching `InitiatedPayment` is found (e.g., due to timing issues, database inconsistencies, or the expiration cron running before the callback arrives), the payment service creates a standalone Payment record without a member association.

This is handled by `createOrphanPayment()` in `payment/server/api/swish.js`:

```javascript
await addPayment({
  type: "swish",
  message,
  amount: Number(amount),
  date: new Date(datePaid),
  mobile: payerAlias,
  externalId: id,
});
```

The orphan payment has no `member` or `membership` field. It appears in the admin UI as an unmatched payment, where an administrator can manually assign it to the correct member.

Similarly, if the `InitiatedPayment` exists but the referenced member is not found in the database, a Payment record is created without member association and logged as a warning.


## 7. Idempotency

The Swish callback handler includes idempotency protection to prevent duplicate processing:

```javascript
if (initiated?.status === 'PAID') {
  console.log(`[Swish] Payment ${id} already processed, skipping`);
  return;
}
```

If the `InitiatedPayment` already has status `PAID` when a callback arrives, the handler returns immediately without creating duplicate Payment or Membership records. The HTTP response is still 200 to acknowledge receipt to Swish.

This protects against Swish sending duplicate callbacks (which can happen in edge cases with network issues).


## 8. Error Handling

### Business rule errors

When `processPayment()` calls `membershipFromPayment()`, the result may be an error instead of membership parameters. In that case the Payment record is still created (for audit), but no Membership is created and the error code is stored on `member.paymentError`. See [business-rules.md](business-rules.md#7-error-cases) for the full list of error codes and resolution steps.

### Swish API errors

If the Swish API returns an error during `payment.initiate()`:

- The `InitiatedPayment` is updated to status `ERROR` with the error message.
- The error is formatted from the Swish response: `HTTP status: {status}, Swish: {errorMessage} ({errorCode}); {additionalInformation}`.
- A `Meteor.Error` is thrown to the client.

### Unrecognized payment types

If `membershipFromPayment()` returns `null` (unrecognized `paymentType`), the Payment record is created but no Membership is generated. A warning is logged.


## 9. Swish Configuration

See [configuration.md](configuration.md#5-swish-configuration) for Swish TLS certificate setup, callback configuration, and test environment instructions.


## 10. Payment Processing Details

The payment processing pipeline lives in `payment/server/api/payments.js`:

1. **`addPayment()`** -- Creates a Payment record with a UUID-based hash for deduplication.
2. **`processPayment(payment, member, paymentType)`** -- Converts a payment into a membership:
   - Calls `membershipFromPayment()` to calculate dates and type (see [business-rules.md](business-rules.md) for the full logic).
   - Creates the Membership record and links it to the Payment.
   - Updates denormalized fields (`member`, `lab`, `family`) on the Member and any family members.
   - On business rule errors, stores the error code on `member.paymentError` without creating a Membership.

For collection schemas, see [data-model.md](data-model.md). For membership calculation rules (grace periods, renewal stacking, upgrades, quarterly extensions, family switching), see [business-rules.md](business-rules.md).


## 11. Payment Options

The available payment types, amounts, and visibility rules are defined in `app/private/paymentOptions.json` and served to clients via `payment.getOptions()`. See [business-rules.md](business-rules.md#1-payment-types) for the full pricing table.


## Related Documentation

- [business-rules.md](business-rules.md) -- Membership pricing, duration calculations, renewal logic
- [architecture.md](architecture.md) -- How the three Meteor apps communicate and share code

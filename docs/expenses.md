# Expense Reimbursement (Utlägg)

## 1. Overview

Members who buy things for the makerspace can submit expenses in the member
PWA: photograph or upload the receipt, fill in amount and details, and submit.
On the admin side a board member confirms that the expense is legitimate, and
the treasurer pays it out and marks it reimbursed — choosing the bookkeeping
account at the same time. Receipts are stored in Google Drive; Slack is
notified at every step via manager events.

The feature spans all of `common/`, `app/`, and `admin/`. Reimbursed expenses
feed verification series `U` in the accounting export — see
[accounting.md](accounting.md).

## 2. Access Control

Expense features in the member app are visible only to members for whom
`expenseAccessAllowed` returns true (`app/server/methods/utils.js`): the
member's email is on `settings.private.expenses.allowList`, **or** the user
has the `admin` or `board` role. The flag is exposed to the client as
`expensesAllowed` in the member info payload and also gates the bank-details
section of the profile (section 6).

Admin actions are role-gated per method (section 5), and **no one can review
their own expense**: confirm, reject, and reimburse all refuse when the acting
admin's member record is the submitter (`assertNotOwnExpense`).

## 3. Lifecycle

Statuses (`expenses.status`): `pending → submitted → confirmed → reimbursed`,
with `rejected` as a side exit and two backward transitions.

| Transition | Who (where) | Method | Notes |
| --- | --- | --- | --- |
| create → `pending` | member (app) | `expenses.create` | photo uploaded to Drive first |
| edit while `pending`/`rejected` | member (app) | `expenses.update`, `expenses.replacePhoto` | amount, account, place, date, note |
| `pending`/`rejected` → `submitted` | member (app) | `expenses.submit` | requires amount > 0 and an expense account; clears any old rejection reason |
| `submitted` → `pending` | member (app) | `expenses.retract` | pull back for editing |
| `pending`/`rejected` → deleted | member (app) | `expenses.abort` | deletes the expense and trashes the Drive file |
| `submitted` → `confirmed` | admin/board (admin) | `expenses.confirm` | sets `confirmedAt/By` |
| `submitted`/`confirmed` → `rejected` | admin/board/treasurer (admin) | `expenses.reject` | reason required (shown to the member); clears `confirmedAt/By` |
| `confirmed` → `reimbursed` | treasurer/admin (admin) | `expenses.reimburse` | sets `bookkeepingAccount`, `reimbursedDate`, `reimbursedAt/By` — see [accounting.md](accounting.md) §4 |
| `reimbursed` → `confirmed` | treasurer/admin (admin) | `expenses.unreimburse` | keeps `bookkeepingAccount`/`reimbursedDate` as defaults for a redo |

All writes go through server methods; direct client writes to the collection
are denied. Every step publishes a manager event (`expenseSubmitted`,
`expenseRetracted`, `expenseConfirmed`, `expenseRejected`,
`expenseReimbursed`, `expenseUnreimbursed`) that typically lands in Slack.

## 4. Receipts

### Storage

Receipt images live in Google Drive on a shared drive, uploaded server-side
through a service account (`common/server/googleDrive.js`; configured under
`settings.private.googleDrive`: `keyFile`, `sharedDriveId`, `rootFolder`).
Before upload the client downscales the image (long edge ≤ 1600 px, JPEG) to
keep uploads fast. The member can take a photo or upload a file — both
options are offered on all devices. Deleting an expense **trashes** the Drive
file rather than hard-deleting it (the service account's Content manager role
cannot permanently delete on a shared drive).

### Serving — signed capability URLs

An `<img>` request carries no DDP session, so receipts are served over HTTP
with signed, unguessable URLs
(`/api/expenses/:id/receipt?v=<driveFileId>&t=<token>`, minted by
`common/server/receiptToken.js` and mounted in both the app and admin):

- The token is an HMAC over expense id + Drive file id + a day bucket,
  keyed by `settings.private.receiptTokenSecret`.
- It is minted only by methods that already passed authorization (owner in
  the app, role in admin) — the endpoint then trusts it like a signed S3 URL.
- Scoping to the Drive file id means replacing the photo changes the URL;
  day-bucketing keeps URLs stable for browser caching while a leaked URL
  expires within ~48 hours.

## 5. Admin Workflows

Menu group **Expenses** in the admin app:

| Page | Route | Contents |
| --- | --- | --- |
| All | `/expenses` | every expense (tabular) |
| Confirm | `/expenses/confirm` | work queue: status `submitted` |
| Reimburse | `/expenses/reimburse` | work queue: status `confirmed` |
| Expense accounts | `/expenses/accounts` | manage expense-account categories |

The expense detail view (`/expense/:id`) shows the receipt (click to zoom),
member, amount, category (with its accounting dimensions), and the member's
bank details for making the payment. Action buttons follow the status:
Confirm/Reject when submitted; a reimburse panel (bookkeeping-account
dropdown + payment-date picker + button) and Reject when confirmed; Undo when
reimbursed.

**Expense accounts** are the categories members choose from. They have a
name, an explanation, and dimension tags used by the accounting export —
deliberately no fixed ledger account (the treasurer picks that per expense).
An account used by any expense cannot be deleted.

## 6. Member Bank Details

So the treasurer can actually pay, members with expense access get a bank
section on their profile page (app): bank name, clearing number, account
number, and account-holder name (the holder is sometimes not the member).
The numbers are stored as entered — no zero-padding or combining; the
treasurer's bank validates the format. The admin expense view shows them
next to the reimburse action, including a digits-only "combined" convenience
string.

Fields on `members`: `bankName`, `bankClearing`, `bankAccountNumber`,
`bankAccountHolder`. They are hidden in the admin members table and only
persisted from the profile when the bank section was shown (a regular
profile save never clobbers them).

## 7. Data Model Summary

`expenses` (see `common/lib/models.js`):

| Field | Meaning |
| --- | --- |
| `memberId`, `amount`, `date`, `place`, `note` | what/who/when |
| `expenseAccountId` | chosen expense-account category |
| `driveFileId`, `mimeType` | the receipt in Google Drive |
| `status` | `pending` / `submitted` / `confirmed` / `rejected` / `reimbursed` |
| `submittedAt`, `confirmedAt/By`, `rejectedAt/By`, `rejectionReason`, `reimbursedAt/By` | audit trail |
| `bookkeepingAccount`, `reimbursedDate` | accounting fields set at reimbursement ([accounting.md](accounting.md)) |

`expenseAccounts`: `name`, `explanation`, `dimensions` (dimension nr →
object code), `createdAt`.

## Related Documentation

- [accounting.md](accounting.md) -- how reimbursed expenses become SIE verifications
- [auth-and-roles.md](auth-and-roles.md) -- roles and the user/member link
- [messaging-notifications.md](messaging-notifications.md) -- manager events / Slack
- [configuration.md](configuration.md) -- settings including `private.expenses.allowList`, `private.googleDrive`, `private.receiptTokenSecret`

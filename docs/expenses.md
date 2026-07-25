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
member's email is on `settings.private.expenses.allowList`, the user has the
`admin` or `board` role, **or** the member is an active member of a group that
has at least one expense account (section 3). The flag is exposed to the client
as `expensesAllowed` in the member info payload and also gates the bank-details
section of the profile (section 7).

Admin actions are role-gated per method (section 6), and **no one can review
their own expense**: confirm, reject, and reimburse all refuse when the acting
admin's member record is the submitter (`assertNotOwnExpense`).

## 3. Expense Accounts and Groups

An **expense account** is the category a member picks when submitting an
expense. Per the workshops-and-groups guideline (`inbox/Riktlinjer.md`) every
account belongs to one or more **groups**, which decides who may spend on it:

- `expenseAccount.groupIds` — the groups the account belongs to. Their active
  members may make expenses on it, and the account is listed on each of those
  groups' pages (app and admin).
- `expenseAccount.approverMemberIds` — the expense approvers (the guideline
  requires at least two). They must be **active members of the account's
  groups**; the admin picker only offers those, and a deny rule on the
  collection enforces it server-side. Removing a group from an account drops
  approvers who are no longer eligible.

Helpers in `app/server/methods/utils.js` implement the access rules:
`myActiveGroupIds`, `myGroupExpenseAccounts`, `seesAllExpenseAccounts`
(allowlist/admin/board), and `expenseAccountsFor` — the last one is the single
source for "which accounts may this member use" and is applied both by
`expenses.getAccounts` (the picker) and when an expense's account is set or
submitted.

Approvers are **stored but not yet authoritative**: confirm/reject/reimburse
remain role-based in admin (section 6). In-app approval by the account's
approvers is a planned follow-up.

### The group's account overview (app)

A group's page lists its expense accounts at the bottom — for the group's
active members only (same gate as the member list). Each card opens
`/expense-accounts/:accountId` — deliberately *not* group-scoped, since an
account can belong to several groups — a read-only overview of everything booked
on that account, served by `expenses.getAccountExpenses`:

- A year filter (defaults to the current year, "all years" available), applied
  to the **receipt date**.
- Three totals of what is shown: reimbursed, confirmed, submitted.
- One card per expense showing submitter, and the **status with the date that
  status change refers to** (submitted → `submittedAt`, confirmed →
  `confirmedAt`, rejected → `rejectedAt`, reimbursed → `reimbursedDate`) plus
  the amount. The shared `statusDate` helper in
  `app/imports/pages/expenses/utils.js` picks both, and is used by the member's
  own expense list too.
- Tapping a card expands the receipt date, place, a truncated note, the status
  timeline (submitted, rejected, confirmed by/at, bookkeeping account,
  reimbursement date — each row appears once that step has happened) and a
  **Show receipt** button that opens the receipt image in a dialog (signed URL,
  minted after the same authorization — see section 5).

Drafts (`pending`) are excluded — they are not claims yet. The view
deliberately shows *other members'* expenses and receipts: the receipts are the
evidence for what the group has spent. Drive ids are never exposed.

From the same page a member can **create** an expense on that account — the
button opens `/expenses/new?account=<id>&returnTo=<the account page>`, so
`expenses.create` preselects the account (validated like any other account
choice) and finishing the expense returns to the account page. The `returnTo`
parameter is honoured by the new/detail pages for save, submit and abort, and
only when it is an in-app path (`safeReturnTo` in
`app/imports/pages/expenses/utils.js`). The member's own expenses get a **Show**
link in the expanded card that opens the expense page (where a submitted expense
can be retracted and a rejected one edited), carrying the same `returnTo`; the
DTO's `isMine` flag drives it without exposing member ids.

The expense's own page shows the same review trail once the expense is locked:
submitted date, who confirmed it and when, the bookkeeping account and the
reimbursement date (`expenses.getOne` resolves `confirmedByName`; it stays null
when the confirmer had no member record, since `confirmedBy` is then never set). The expense page links back to its account (the picked account
while editing, the saved one otherwise). Back navigation everywhere is the
standard top-bar arrow — the account page is registered in `DETAIL_PAGES`
(`app/imports/components/TopBar/index.jsx`) with `/groups` as its fallback.

## 4. Lifecycle

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

## 5. Receipts

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
  the app, an active member of the account's groups in the group overview, role
  in admin) — the endpoint then trusts it like a signed S3 URL.
- Scoping to the Drive file id means replacing the photo changes the URL;
  day-bucketing keeps URLs stable for browser caching while a leaked URL
  expires within ~48 hours.

## 6. Admin Workflows

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

## 7. Member Bank Details

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

## 8. Data Model Summary

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
object code), `groupIds` (owning groups), `approverMemberIds` (expense
approvers, from those groups), `createdAt`.

Client writes to `expenseAccounts` are admin/board-only, and a deny rule
rejects approvers who are not active members of the account's groups
(`common/collections/expenseAccounts.js`). A group cannot be deleted while an
account still references it.

## Related Documentation

- [accounting.md](accounting.md) -- how reimbursed expenses become SIE verifications
- [auth-and-roles.md](auth-and-roles.md) -- roles and the user/member link
- [messaging-notifications.md](messaging-notifications.md) -- manager events / Slack
- [configuration.md](configuration.md) -- settings including `private.expenses.allowList`, `private.googleDrive`, `private.receiptTokenSecret`

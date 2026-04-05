# UMSME Business Rules

This document describes the membership business rules implemented in UMSME, including payment types, duration calculations, renewal logic, and edge cases.

The authoritative implementation lives in two functions:

- **`common/lib/utils.js` :: `membershipFromPayment()`** -- Type-key-based membership calculation used by the Swish payment path (the current primary path).
- **`common/lib/rules.js` :: `membershipFromPayment()`** -- Amount-based membership calculation used by the admin/bankgiro sync path (legacy).

---

## 1. Payment Types

Each payment option is identified by a `paymentType` key. The configuration lives in `app/private/paymentOptions.json` and is served to clients via the `payment.getOptions` Meteor method.

| Key | Type | Family | Discount | Duration | Amount (SEK) | Period |
|-----|------|--------|----------|----------|-------------|--------|
| `memberBase` | `member` | false | false | 1 year | 200 | year |
| `memberDiscountedBase` | `member` | false | true | 1 year | 100 | year |
| `memberLab` | `labandmember` | false | false | 1 year member + 1 year lab | 1600 | year |
| `memberDiscountedLab` | `labandmember` | false | true | 1 year member + 1 year lab | 1200 | year |
| `memberQuarterlyLab` | `lab` | false | false | 3 months lab | 450 | quarter |
| `familyBase` | `member` | true | false | 1 year | 300 | year |
| `familyLab` | `labandmember` | true | false | 1 year member + 1 year lab | 2000 | year |

**Visibility rules** in the payment selection UI:

- Options with `discountedOnly: true` (`memberDiscountedBase`, `memberDiscountedLab`) are only shown when the discount checkbox is checked.
- Options with `familyOnly: true` (`familyBase`, `familyLab`) are only shown when the family checkbox is checked.

---

## 2. Membership Duration Rules

There are two independent date ranges tracked per member:

- **Member end date** (`memberend`) -- basic membership expiry.
- **Lab end date** (`labend`) -- lab access expiry.

Duration rules by membership type:

| Membership type | Member duration | Lab duration |
|-----------------|----------------|--------------|
| `member` (base) | 1 year | none |
| `lab` (quarterly) | unchanged (extended only if lab exceeds member) | 3 months |
| `labandmember` | 1 year | 1 year |

Lab access always requires an active basic membership. If a quarterly lab extension pushes `labend` past `memberend`, the system automatically extends `memberend` to match `labend`.

---

## 3. Grace Period

A grace period is added between the payment date and the start of the membership period for first-time members only. This allows time to complete mandatory certifications before access is granted.

| Member status | Grace period |
|---------------|-------------|
| First-time (no prior `member` date) | **14 days** |
| Returning (has prior `member` date) | **0 days** |

The grace period is added to the payment date before calculating end dates. For example, a first-time member paying on Jan 1 gets `memberend` = Jan 15 of the following year (Jan 1 + 14 days + 1 year).

---

## 4. Renewal Timing

### Early renewal (before expiry)

When a member pays before their current membership expires, the new end date extends from the **current end date**, not the payment date. Members do not lose time by paying early.

- `memberend = current_memberend + 1 year`
- `labend = current_labend + 1 year` (or + 3 months for quarterly)

### Late renewal (after expiry)

When a member pays after expiry, the new end date extends from the **payment date**:

- `memberend = payment_date + 1 year`
- `labend = payment_date + 1 year` (or + 3 months for quarterly)

The `start` field on the Membership record tracks the effective start date, which equals either the current end date (early renewal) or the payment date (late/first-time).

---

## 5. Quarterly Lab Scenarios

Quarterly lab (`memberQuarterlyLab`) has special handling because it only extends lab access and requires an existing base membership.

### Q1: First-time member buys quarterly

**Result**: ERROR -- `QUARTERLY_WITHOUT_BASE_MEMBERSHIP`

Quarterly lab requires an existing basic membership. First-time members must purchase `memberBase`, `memberLab`, or a family equivalent first.

### Q2: Active membership, no lab (labend is null or expired)

**Precondition**: `member.member > now`, `member.lab` is null or `member.lab <= now`.

**Result**:
- `start` = now
- `labend` = now + 3 months
- `memberend` = max(current memberend, new labend)

This is the standard "add lab to an existing base membership" case.

### Q3: Active membership and active lab, memberend != labend

**Precondition**: `member.member > now`, `member.lab > now`, `member.member != member.lab`.

**Result**:
- `start` = current labend
- `labend` = current labend + 3 months
- `memberend` = max(current memberend, new labend)

The lab extension stacks from the current lab end date.

### Q4: Active membership and active lab, memberend == labend

**Precondition**: `member.member > now`, `member.lab > now`, `member.member == member.lab`.

**Result**: Same calculation as Q3.
- `start` = current labend
- `labend` = current labend + 3 months
- `memberend` = max(current memberend, new labend)

**UI note**: The UI discourages this scenario. When `quarterly=true` and `labEnd === memberEnd`, the quarterly option is disabled with reason `disabledRenewYearlyFirst`. The goal is to allow at most one quarterly renewal before prompting for a yearly renewal.

Additionally, if a member has an active quarterly lab and `labEnd` is more than 14 days away, the quarterly option is disabled with `disabledTooEarlyToRenew`.

---

## 6. Switching Scenarios

### S1: Base membership -> Lab membership (upgrade)

A member with active `memberBase` (or `familyBase`) pays for `memberLab` (or `familyLab`/`memberDiscountedLab`), and has no active lab.

**Two sub-cases based on remaining membership time**:

| Condition | Start | Memberend | Labend |
|-----------|-------|-----------|--------|
| `memberend > now + 2 months` | now + 2 months | now + 14 months | now + 14 months |
| `memberend <= now + 2 months` | current memberend | current memberend + 1 year | current memberend + 1 year |

**Rationale**: When upgrading mid-membership with significant time remaining (> 2 months), the 14-month duration compensates for the "wasted" base membership value. When close to expiry (<= 2 months), the standard renewal-from-current-end logic applies.

### S2: Lab membership -> Base membership (downgrade)

A member with active lab pays for `memberBase` (or `familyBase`/`memberDiscountedBase`).

**Result**:
- `labend`: **unchanged** -- existing lab access continues until it expires
- `memberend` = current memberend + 1 year

The lab end date field is set to `undefined` on the new Membership record (the existing lab Membership record retains it).

### S3: Regular -> Family (upgrade)

Switching from a non-family to a family payment type. The family flag takes effect immediately, giving additional value (family members gain access).

**Restriction**: Only allowed within 14 days of `memberend` to prevent abuse.

- **Allowed**: `now >= memberend - 14 days` (or member is expired/new)
- **ERROR** if `now < memberend - 14 days`: `FAMILY_UPGRADE_TOO_EARLY`

Applies to all combinations:
- S3a: `memberBase` -> `familyBase`
- S3b: `memberBase` -> `familyLab`
- S3c: `memberLab` -> `familyBase`
- S3d: `memberLab` -> `familyLab`

### S4: Family -> Regular (downgrade)

Switching from a family to a non-family payment type. The family flag is removed immediately, losing value for family members.

**Restriction**: Only allowed within 14 days of `memberend` to protect members.

- **Allowed**: `now >= memberend - 14 days` (or member is expired/new)
- **ERROR** if `now < memberend - 14 days`: `FAMILY_DOWNGRADE_TOO_EARLY`

Applies to all combinations:
- S4a: `familyBase` -> `memberBase`
- S4b: `familyBase` -> `memberLab`
- S4c: `familyLab` -> `memberBase`
- S4d: `familyLab` -> `memberLab`

**UI note**: The UI prevents switching family status outside the 14-day window by locking the family checkbox. The checkbox is only editable for new members, expired members, or members within the renewal window.

---

## 7. Error Cases

These situations should be prevented in the UI but may occur via other payment mechanisms (e.g., bank transfer). They require manual admin intervention.

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `QUARTERLY_WITHOUT_BASE_MEMBERSHIP` | First-time member attempted to purchase quarterly lab without having a basic membership | Admin must manually create a base membership or refund the payment |
| `FAMILY_UPGRADE_TOO_EARLY` | Regular member attempted to switch to family membership more than 14 days before memberend | Admin must manually adjust dates or refund the payment |
| `FAMILY_DOWNGRADE_TOO_EARLY` | Family member attempted to switch to regular membership more than 14 days before memberend | Admin must manually adjust dates or refund the payment |

### Error handling flow

When an error case is detected in `membershipFromPayment()`:

1. The Payment record is created (for audit trail).
2. No Membership record is created.
3. The `paymentError` field is set on the Member document with the error code.
4. A warning is logged for admin review.
5. The Swish callback returns HTTP 200 (to prevent Swish retries).

When a payment is successfully processed, `paymentError` is cleared (set to `null`).

---

## 8. Family Memberships

A family membership covers one paying member plus additional family members who share the same membership end dates. See [data-model.md](data-model.md#4-family-membership-pattern) for how the `infamily` linking, invite flow, and denormalized fields work.

### Family switching restrictions

Switching between family and non-family is restricted to a 14-day window before `memberend` (see [S3](#s3-regular---family-upgrade) and [S4](#s4-family---regular-downgrade)). Outside this window, the family checkbox in the UI is locked.

### Family members and reminders

Members with an `infamily` reference are excluded from the reminder system. Only the paying member receives renewal reminders.

---

## 9. Discounted Memberships

### Eligibility

Discounted rates are available for students, pensioners, and unemployed members. The system does not verify eligibility automatically -- the member self-selects the discount checkbox in the UI.

### Discount pricing

| Regular | Discounted | Savings |
|---------|-----------|---------|
| `memberBase` -- 200 SEK | `memberDiscountedBase` -- 100 SEK | 100 SEK |
| `memberLab` -- 1600 SEK | `memberDiscountedLab` -- 1200 SEK | 400 SEK |

Family memberships do not have discounted variants. The discount and family checkboxes are mutually exclusive in the UI -- selecting family clears the discount checkbox.

### Tracking

The `discount` flag is stored on each Membership record and is used when computing `memberStatus()` to report whether the member's current active membership is discounted.

---

## 10. Reminder Rules

Defined in `common/lib/rules.js`:

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `reminderDays` | **21** | Days before expiry to trigger a "needed" reminder |
| `overdueReminderDays` | **14** | Days after expiry for an "overdue" reminder |

### Reminder states

The `reminderState()` function computes a state for each member based on their dates:

| State | Condition |
|-------|-----------|
| `none` | No reminder has ever been sent and no reminder is needed |
| `needed` | Member or lab expiry is within the next 21 days (but not yet expired) |
| `overdue` | Member or lab has expired within the last 14 days |
| `done` | A reminder was sent within the last 42 days (cooldown period: `reminderDays * 2 = 42 days`) |
| `old` | A reminder was sent, but more than 42 days ago |

### Evaluation order

1. If the member was reminded within the last 42 days -> `done` (cooldown active).
2. Else if member or lab expiry is within 21 days (and still in the future) -> `needed`.
3. Else if member or lab expired within the last 14 days -> `overdue`.
4. Else if a reminder exists at all -> `old`.
5. Otherwise -> `none`.

### Exclusions

Members with an `infamily` reference are excluded from reminders entirely. Only the paying family member receives reminders.

---

## 11. Member Status Calculation

The `memberStatus()` function in `common/lib/utils.js` computes the aggregate membership state for a member by iterating all Membership records. For family members, it follows the `infamily` reference to compute status from the paying member's memberships. See [data-model.md](data-model.md#memberstatus) for the full algorithm and return value description.

---

## 12. Legacy Amount-Based Rules

The function `membershipFromPayment()` in `common/lib/rules.js` is a legacy implementation that maps payment amounts directly to membership types. It is used by the admin/bank sync path for bankgiro payments, where only the transfer amount is known (no `paymentType` key).

### Amount mapping

| Amount (SEK) | Type | Family | Discount | Member duration | Lab duration |
|-------------|------|--------|----------|----------------|--------------|
| 100 | `member` | false | true | 1 year | none |
| 200 | `member` | false | false | 1 year | none |
| 300 | `member` | true | false | 1 year | none |
| 450 | `lab` | false | false | none | 3 months |
| 550 | `labandmember` | false | true | 1 year | 3 months |
| 650 | `labandmember` or `lab` | false | false | 1 year or none | 3 months or 9 months |
| 750 | `lab` | false | false | none | 9 months |
| 1000 | `labandmember` | false | true | 1 year | 12 months |
| 1200 | `labandmember` | false | true | 1 year | 12 months |
| 1600 | `labandmember` | false | false | 1 year | 12 months |
| 1500 | `labandmember` | true | false | 1 year | 12 months |
| 2000 | `labandmember` | true | false | 1 year | 12 months |

**Notes on ambiguous amounts**:

- **650 SEK**: Context-dependent. If `potentialLabPayment` is true (member has an active membership not close to expiry), it is treated as a 9-month lab complement (the member previously paid 100 or 200 + 450). Otherwise, it is treated as regular 200 + quarterly 450.
- **750 SEK**: Always treated as a 9-month lab complement (regular 200 member previously paid, now complementing up to yearly lab).
- **1000 SEK**: Old discounted lab rate, mapped same as 1200.
- **1500 SEK**: Old family rate, mapped same as 2000.

### Grace period (legacy)

The legacy function applies a different grace period: **14 days** for first-time members, **7 days** for returning members (vs. 0 days in the current implementation).

### Start date calculation

The legacy `startDateFromAmount()` function determines the start date:

- For lab-related amounts (450, 650, 750): uses the current lab end date if it is in the future, otherwise uses today.
- For all other amounts: uses the current member end date if it is in the future, otherwise uses today.

---

## 13. UI Availability Rules

The `availabilityRules.js` module in the app controls which payment options are enabled in the membership selection UI.

### Yearly options

| Member status | Yearly options available? |
|---------------|--------------------------|
| New member (`type = "none"`) | All enabled |
| Expired member (`memberEnd < now`) | All enabled |
| Active, within 14-day renewal window (`memberEnd <= now + 14 days`) | All enabled |
| Active, outside renewal window (`memberEnd > now + 14 days`) | All disabled (`disabledTooEarlyToRenew`) |

### Quarterly lab option

| Condition | Available? | Reason |
|-----------|-----------|--------|
| New or expired member | No | `disabledNoBaseMembership` |
| Has yearly lab (`type = "labandmember"`, `quarterly = false`) | No | `disabledHasYearlyLab` |
| Has quarterly lab, `labEnd === memberEnd` | No | `disabledRenewYearlyFirst` |
| Has quarterly lab, `labEnd > now + 14 days` | No | `disabledTooEarlyToRenew` |
| Has base membership only (`type = "member"`) | Yes | -- |
| Has quarterly lab, within renewal window | Yes | -- |

---

## Related Documentation

- [payments.md](payments.md) -- Payment processing flows (Swish callback, bankgiro sync)
- [data-model.md](data-model.md) -- Collection schemas and field definitions

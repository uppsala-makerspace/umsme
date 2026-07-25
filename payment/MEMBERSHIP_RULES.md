# Membership Rules and Edge Cases

This document describes the business rules for membership creation and renewal, including error cases that require manual intervention.

## Payment Type Keys

| Key | Type | Family | Discount | Duration |
|-----|------|--------|----------|----------|
| memberBase | member | false | false | 1 year |
| memberDiscountedBase | member | false | true | 1 year |
| memberLab | labandmember | false | false | 1 year |
| memberDiscountedLab | labandmember | false | true | 1 year |
| memberQuarterlyLab | lab | false | false | 3 months |
| familyBase | member | true | false | 1 year |
| familyLab | labandmember | true | false | 1 year |
| toFamilyLab | labandmember | true | false | unchanged (S3d upgrade) |
| discountedToFamilyLab | labandmember | true | false | unchanged (S3d upgrade) |

`toFamilyLab` / `discountedToFamilyLab` are upgrade-only products: they top up an
active lab membership to family for the price difference and leave the end dates
alone. They differ only in price — the previous membership's discount decides
which one is offered — so the date calculation treats them identically, and both
produce a full-price family membership (`discount: false`).

## Grace Period

- **First-time members**: 14 days grace period (for certification purposes)
- **Returning members**: 0 days grace period

## Renewal Timing

### Early Renewal (before expiry)
- New end date extends from **current end date**, not payment date
- Members don't lose time by paying early

### Late Renewal (after expiry)
- New end date extends from **payment date**

---

## Quarterly Lab Scenarios

### Q1: First-time member buys quarterly
**Result**: ERROR - `QUARTERLY_WITHOUT_BASE_MEMBERSHIP`

Quarterly lab requires an existing basic membership. First-time members must purchase memberBase, memberLab, or family equivalent first.

### Q2: Member with active membership, no lab (labend == null or labend < now)
**Result**:
- labend = now + 3 months
- if labend > memberend then memberend = labend

### Q3: Member with active membership and active lab, memberend != labend
**Result**:
- labend = labend + 3 months
- if labend > memberend then memberend = labend

### Q4: Member with active membership and active lab, memberend == labend
**Result**: Same as Q3
- labend = labend + 3 months
- if labend > memberend then memberend = labend

**UI Note**: Discourage this scenario in the UI. Encourage yearly membership renewal instead of repeated quarterly renewals. Goal: allow at most one quarterly renewal before prompting for yearly renewal.

---

## Switching Scenarios

### S1: Membership → memberLab (upgrade to lab)

Member has active memberBase (or familyBase), pays for memberLab:

- If memberend > now + 2 months:
  - labend = memberend = now + 14 months
- Otherwise (memberend ≤ now + 2 months):
  - labend = memberend = memberend + 1 year

**Reason**: The 14 months (`UPGRADE_MONTHS`) compensates for "wasted" membership value (~1-2 months worth of lab cost) when upgrading mid-membership. The same constant governs the family upgrades (S3a/S3b), so all full-price mid-period upgrades grant the same period.

### S2: Lab → memberBase (downgrade to membership only)

Member has active lab (memberLab/familyLab), pays for memberBase:

- labend: **unchanged** (keeps existing lab access until it expires)
- memberend = memberend + 1 year

### S3: Regular → Family

Within the renewal window (`MEMBERSHIP_RENEWAL_WINDOW_DAYS` before memberend) this is an ordinary renewal that happens to flip the family flag — unchanged behaviour. Earlier than that it is an **upgrade**: allowed, but on upgrade terms.

| Case | From → to | Payment type | New end dates |
|------|-----------|--------------|---------------|
| S3a | memberBase → familyBase | `familyBase` (full price) | memberend = now + 14 months |
| S3b | memberBase → familyLab | `familyLab` (full price) | memberend = labend = now + 14 months |
| S3c | memberLab → familyBase | — | **ERROR** `FAMILY_UPGRADE_TOO_EARLY` |
| S3d | memberLab → familyLab | `toFamilyLab` / `discountedToFamilyLab` (difference only) | **unchanged** |

**S3a/S3b**: paying a full family price buys **`UPGRADE_MONTHS` (14) months from the payment date** rather than extending the old end date — the same shared constant as the S1 lab upgrade, so all full-price mid-period upgrades behave alike. The extra 2 months compensate for the membership value given up. S3b is handled before the S1 rule so a family upgrade always grants the full period, rather than falling into S1's "memberend is less than 2 months away" sub-case.

**S3c**: moving to familyBase while holding an active lab would mean paying for less than you already have, so it is refused outside the renewal window. Inside the window it is a normal renewal and allowed.

**S3d**: the member keeps their period and pays only the difference, so no dates change — only the family flag. Quarterly lab members are not offered this; they renew into a full family lab year (S3b) instead.

Note: like other upgrades, S3d creates a new Membership document whose end date matches the one it effectively replaces, so a member can end up with two memberships covering the same period. The statistics count such a member once (see section 14 of docs/business-rules.md); the duplicate records themselves remain, and how to model replacement properly is a separate discussion.

### S4: Family → Regular

The family flag is removed immediately, losing value. To protect members:

- **Allowed**: Payment within the renewal window before memberend
- **ERROR** earlier than the renewal window: `FAMILY_DOWNGRADE_TOO_EARLY`

Unlike S3, a downgrade is never allowed mid-period — the member would lose
access they have already paid for.

Applies to all combinations:
- S4a: familyBase → memberBase
- S4b: familyBase → memberLab
- S4c: familyLab → memberBase
- S4d: familyLab → memberLab

**UI Note**: Discourage paying in advance for family → regular switches. Display warning that restrictions take effect immediately.

---

## Error Cases

These situations should be prevented in the UI but may occur via other payment mechanisms (e.g., bank transfer). They require manual intervention.

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `QUARTERLY_WITHOUT_BASE_MEMBERSHIP` | First-time member attempted to purchase quarterly lab without having a basic membership | Admin must manually create membership or refund payment |
| `FAMILY_UPGRADE_TOO_EARLY` | S3c: member with an active lab attempted to switch to familyBase earlier than the renewal window | Admin must manually adjust dates or refund payment |
| `FAMILY_DOWNGRADE_TOO_EARLY` | Family member attempted to switch to regular membership earlier than the renewal window | Admin must manually adjust dates or refund payment |
| `FAMILY_LAB_UPGRADE_NOT_APPLICABLE` | `toFamilyLab`/`discountedToFamilyLab` paid by someone without an active non-family lab membership to top up | Admin must manually create the right membership or refund payment |

### Error Handling

When an error case is detected:
1. Create the Payment record (for audit trail)
2. Do NOT create a Membership record
3. Set error field on the member object with the error code
4. Log warning for admin review
5. Return 200 to Swish (prevent retries)

---

## UI Notes Summary

1. **Quarterly renewal warning**: Discourage second quarterly renewal if it would push memberend beyond original. Encourage yearly membership.

2. **Family switch timing**: Family can be checked *in* at any time (S3 upgrade) but only checked *out* within the renewal window (S4). Outside the window, offer the upgrade options per the S3 table — the difference-only family lab product for yearly lab members, and familyBase disabled for them (S3c) — each marked as an upgrade. Display warning for family → regular that restrictions take effect immediately.

3. **Unsupported changes**: Display message that users should contact the board for membership type changes not supported in the UI.

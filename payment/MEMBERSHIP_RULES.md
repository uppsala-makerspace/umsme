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

**Reason**: The 14 months compensates for "wasted" membership value (~1-2 months worth of lab cost) when upgrading mid-membership.

### S2: Lab → memberBase (downgrade to membership only)

Member has active lab (memberLab/familyLab), pays for memberBase:

- labend: **unchanged** (keeps existing lab access until it expires)
- memberend = memberend + 1 year

### S3: Regular → Family

The family flag takes effect immediately, giving more value. To be generous but prevent abuse:

- **Allowed**: Payment within 14 days of memberend
- **ERROR** if payment > 14 days before memberend: `FAMILY_UPGRADE_TOO_EARLY`

Applies to all combinations:
- S3a: memberBase → familyBase
- S3b: memberBase → familyLab
- S3c: memberLab → familyBase
- S3d: memberLab → familyLab

### S4: Family → Regular

The family flag is removed immediately, losing value. To protect members:

- **Allowed**: Payment within 14 days of memberend
- **ERROR** if payment > 14 days before memberend: `FAMILY_DOWNGRADE_TOO_EARLY`

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
| `FAMILY_UPGRADE_TOO_EARLY` | Regular member attempted to switch to family membership more than 14 days before memberend | Admin must manually adjust dates or refund payment |
| `FAMILY_DOWNGRADE_TOO_EARLY` | Family member attempted to switch to regular membership more than 14 days before memberend | Admin must manually adjust dates or refund payment |

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

2. **Family switch timing**: Only allow family ↔ regular switches within 14 days of memberend. Display warning for family → regular that restrictions take effect immediately.

3. **Unsupported changes**: Display message that users should contact the board for membership type changes not supported in the UI.

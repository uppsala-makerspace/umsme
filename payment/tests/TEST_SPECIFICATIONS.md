# Payment Callback Service - Test Specifications

This document describes the e2e tests for the payment callback service.

## Test Environment

- **Database**: Meteor-managed MongoDB (in `.meteor/local/db`)
- **Port**: 3004 (test server)
- **Framework**: Mocha (via meteortesting:mocha)

## Running Tests

```bash
# Run tests once (CI mode)
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

Each test is self-contained: it clears the database in `beforeEach` and creates only the data it needs.

---

## Test Categories Overview

| Category | File | Count | Description |
|----------|------|-------|-------------|
| VAL | swish/validation.test.js | 2 | HTTP validation |
| NIP | swish/no-initiated-payment.test.js | 4 | Orphan payment handling |
| INIT | swish/initiated-payment.test.js | 6 | Core callback flow |
| IDEM | swish/idempotency.test.js | 2 | Duplicate callback handling |
| TYPE | business-logic/membership-types.test.js | 7 | Payment type mapping |
| RENEW | business-logic/renewal-timing.test.js | 6 | Grace period and extension timing |
| QLAB | business-logic/quarterly-lab.test.js | 5 | Quarterly lab scenarios (Q1-Q4) |
| SWITCH | business-logic/switching.test.js | 3 | Upgrade/downgrade scenarios (S1-S2) |
| FAMILY | business-logic/family-switching.test.js | 4 | Family switching (S3-S4) |
| ERROR | business-logic/error-cases.test.js | 3 | Error handling verification |
| DENORM | business-logic/member-denormalized.test.js | 9 | Member field denormalization |

**Total: 51 tests**

---

## 1. Validation Tests (VAL)

Basic HTTP validation.

| Test ID | Description |
|---------|-------------|
| VAL-001 | GET request returns 405 |
| VAL-002 | Invalid JSON returns 400 |

---

## 2. No Initiated Payment Tests (NIP)

Callbacks without matching initiatedPayment.

| Test ID | Description |
|---------|-------------|
| NIP-001 | PAID creates orphan payment with externalId |
| NIP-002 | CANCELLED logs warning, returns 200 |
| NIP-003 | DECLINED logs warning, returns 200 |
| NIP-004 | ERROR logs warning, returns 200 |

---

## 3. Initiated Payment Tests (INIT)

Core callback flow with initiatedPayment.

| Test ID | Description |
|---------|-------------|
| INIT-001 | PAID creates payment and membership |
| INIT-002 | PAID updates initiatedPayment status |
| INIT-003 | CANCELLED updates status |
| INIT-004 | DECLINED updates with error info |
| INIT-005 | ERROR updates with error info |
| INIT-006 | Unknown paymentType creates payment but no membership |

---

## 4. Idempotency Tests (IDEM)

Duplicate callback handling.

| Test ID | Description |
|---------|-------------|
| IDEM-001 | Duplicate PAID doesn't create second payment |
| IDEM-002 | Duplicate PAID doesn't create second membership |

---

## 5. Membership Type Tests (TYPE)

Payment type to membership mapping.

| Test ID | paymentType | type | family | discount |
|---------|-------------|------|--------|----------|
| TYPE-001 | memberBase | member | false | false |
| TYPE-002 | memberDiscountedBase | member | false | true |
| TYPE-003 | memberLab | labandmember | false | false |
| TYPE-004 | memberDiscountedLab | labandmember | false | true |
| TYPE-005 | memberQuarterlyLab | lab | false | false |
| TYPE-006 | familyBase | member | true | false |
| TYPE-007 | familyLab | labandmember | true | false |

---

## 6. Renewal Timing Tests (RENEW)

Grace period and extension timing (from MEMBERSHIP_RULES.md).

| Test ID | Scenario | Expected |
|---------|----------|----------|
| RENEW-001 | First-time memberBase | paymentDate + 14d + 1y |
| RENEW-002 | Renewal before expiry | currentMemberend + 1y |
| RENEW-003 | Renewal after expiry | paymentDate + 1y |
| RENEW-004 | First-time memberLab | both dates: +14d +1y |
| RENEW-005 | Lab renewal before expiry | labend extends from current |
| RENEW-006 | Lab renewal after expiry with active membership | triggers S1 upgrade path |

---

## 7. Quarterly Lab Tests (QLAB)

Maps to Q1-Q4 scenarios in MEMBERSHIP_RULES.md.

| Test ID | Scenario | Expected |
|---------|----------|----------|
| QLAB-001 | Q1: First-time member buys quarterly | ERROR: QUARTERLY_WITHOUT_BASE_MEMBERSHIP |
| QLAB-002 | Q2: Has membership, no lab | labend = now + 3mo |
| QLAB-003 | Q3: Has lab, memberend != labend | labend = labend + 3mo |
| QLAB-004 | Q4: Has lab, memberend == labend | labend = labend + 3mo |
| QLAB-005 | Quarterly extends labend past memberend | memberend = labend |

---

## 8. Switching Scenarios Tests (SWITCH)

Maps to S1-S2 scenarios in MEMBERSHIP_RULES.md.

| Test ID | Scenario | Expected |
|---------|----------|----------|
| SWITCH-001 | S1a: Base->Lab, memberend > now + 2mo | labend = memberend = now + 14mo |
| SWITCH-002 | S1b: Base->Lab, memberend <= now + 2mo | labend = memberend = memberend + 1y |
| SWITCH-003 | S2: Lab->Base | labend unchanged, memberend + 1y |

---

## 9. Family Switching Tests (FAMILY)

Maps to S3-S4 scenarios in MEMBERSHIP_RULES.md.

| Test ID | Scenario | Expected |
|---------|----------|----------|
| FAMILY-001 | S3 allowed: Regular->Family within 14d of memberend | OK, family=true |
| FAMILY-002 | S3 error: Regular->Family > 14d before memberend | ERROR: FAMILY_UPGRADE_TOO_EARLY |
| FAMILY-003 | S4 allowed: Family->Regular within 14d of memberend | OK, family=false |
| FAMILY-004 | S4 error: Family->Regular > 14d before memberend | ERROR: FAMILY_DOWNGRADE_TOO_EARLY |

---

## 10. Error Case Tests (ERROR)

Verifies error handling mechanics: payment created (audit trail), no membership created, paymentError set on member.

| Test ID | Error Code | Trigger |
|---------|------------|---------|
| ERROR-001 | QUARTERLY_WITHOUT_BASE_MEMBERSHIP | First-time member pays for quarterly |
| ERROR-002 | FAMILY_UPGRADE_TOO_EARLY | Regular->family > 14d before memberend |
| ERROR-003 | FAMILY_DOWNGRADE_TOO_EARLY | Family->regular > 14d before memberend |

---

## 11. Member Denormalized Field Tests (DENORM)

Verifies that member objects are updated with denormalized fields (member, lab, family) after payment, and that family members are also updated.

| Test ID | Scenario | Expected |
|---------|----------|----------|
| DENORM-001 | memberBase payment | member.member and member.family updated |
| DENORM-002 | memberLab payment | member.member, member.lab, member.family updated |
| DENORM-003 | familyBase payment | member.family = true |
| DENORM-004 | memberQuarterlyLab payment | member.lab updated |
| DENORM-005 | Payment after error | paymentError cleared |
| DENORM-006 | familyBase with family members | All family members get same dates |
| DENORM-007 | familyLab with family members | All family members get member and lab dates |
| DENORM-008 | Non-family payment | Unrelated members not updated |
| DENORM-009 | Regular payment with infamily members | Family members not updated (only family payments do) |

---

## Test Organization

Tests are organized into two folders:

- **swish/** - HTTP endpoint tests (VAL, NIP, INIT, IDEM)
- **business-logic/** - Payment processing rules tests (TYPE, RENEW, QLAB, SWITCH, FAMILY, ERROR, DENORM)

Each folder has its own `helpers.js`:
- `swish/helpers.js` - HTTP helpers: `postCallback`, `createInitiatedPayment`
- `business-logic/helpers.js` - API helpers: `processPayment` (calls payments.js directly)

Shared helpers (`clearTestData`, `createTestMember`) are in `test-helpers.js`.

## Implementation Notes

- Swish tests use HTTP requests to the callback endpoint
- Business logic tests call `processPayment` API directly (no HTTP)
- Database is cleared in `beforeEach`, each test creates its own data
- Orphan payments are identified by having externalId but no member field
- Family members are linked via the `infamily` field pointing to the paying member's _id

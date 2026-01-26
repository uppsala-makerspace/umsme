/**
 * Membership Type Tests (TYPE)
 *
 * Tests for correct membership creation based on payment type.
 */

import assert from 'assert';
import { Payments } from '/imports/common/collections/payments';
import { Memberships } from '/imports/common/collections/memberships';
import {
  postCallback,
  clearTestData,
  createTestMember,
  createInitiatedPayment,
  processPayment,
} from '../test-helpers';

describe('Membership Type Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('TYPE-001: memberBase creates member type, not family, not discounted', async function () {
    const memberId = await createTestMember();
    const swishId = 'type-001-' + Date.now();

    const membership = await processPayment(memberId, swishId, 'memberBase', 300);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'member');
    assert.strictEqual(membership.family, false);
    assert.strictEqual(membership.discount, false);
  });

  it('TYPE-002: memberDiscountedBase creates member type, not family, discounted', async function () {
    const memberId = await createTestMember();
    const swishId = 'type-002-' + Date.now();

    const membership = await processPayment(memberId, swishId, 'memberDiscountedBase', 150);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'member');
    assert.strictEqual(membership.family, false);
    assert.strictEqual(membership.discount, true);
  });

  it('TYPE-003: memberLab creates labandmember type, not family, not discounted', async function () {
    const memberId = await createTestMember();
    const swishId = 'type-003-' + Date.now();

    const membership = await processPayment(memberId, swishId, 'memberLab', 1200);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'labandmember');
    assert.strictEqual(membership.family, false);
    assert.strictEqual(membership.discount, false);
    assert.ok(membership.labend, 'Lab end should be set');
    assert.ok(membership.memberend, 'Member end should be set');
  });

  it('TYPE-004: memberDiscountedLab creates labandmember type, not family, discounted', async function () {
    const memberId = await createTestMember();
    const swishId = 'type-004-' + Date.now();

    const membership = await processPayment(memberId, swishId, 'memberDiscountedLab', 600);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'labandmember');
    assert.strictEqual(membership.family, false);
    assert.strictEqual(membership.discount, true);
    assert.ok(membership.labend, 'Lab end should be set');
    assert.ok(membership.memberend, 'Member end should be set');
  });

  it('TYPE-005: memberQuarterlyLab for existing member creates lab type', async function () {
    // Quarterly requires existing membership
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);
    const memberId = await createTestMember({ member: futureDate });
    const swishId = 'type-005-' + Date.now();

    const membership = await processPayment(memberId, swishId, 'memberQuarterlyLab', 350);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'lab');
    assert.strictEqual(membership.family, false);
    assert.strictEqual(membership.discount, false);
    assert.ok(membership.labend, 'Lab end should be set');
  });

  it('TYPE-006: familyBase creates member type, family, not discounted', async function () {
    const memberId = await createTestMember();
    const swishId = 'type-006-' + Date.now();

    const membership = await processPayment(memberId, swishId, 'familyBase', 500);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'member');
    assert.strictEqual(membership.family, true);
    assert.strictEqual(membership.discount, false);
  });

  it('TYPE-007: familyLab creates labandmember type, family, not discounted', async function () {
    const memberId = await createTestMember();
    const swishId = 'type-007-' + Date.now();

    const membership = await processPayment(memberId, swishId, 'familyLab', 1400);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'labandmember');
    assert.strictEqual(membership.family, true);
    assert.strictEqual(membership.discount, false);
    assert.ok(membership.labend, 'Lab end should be set');
    assert.ok(membership.memberend, 'Member end should be set');
  });

  it('TYPE-008: Unknown paymentType creates payment only, no membership', async function () {
    const memberId = await createTestMember();
    const swishId = 'type-008-' + Date.now();

    await createInitiatedPayment(memberId, swishId, 'unknownType', 100);

    await postCallback({
      id: swishId,
      status: 'PAID',
      amount: 100,
      payerAlias: '46701234567',
      datePaid: new Date().toISOString(),
    });

    // Payment should be created
    const payment = await Payments.findOneAsync({ swishID: swishId });
    assert.ok(payment, 'Payment should be created');
    assert.strictEqual(payment.member, memberId);

    // No membership should be created
    const membershipCount = await Memberships.find({ mid: memberId }).countAsync();
    assert.strictEqual(membershipCount, 0, 'No membership should be created for unknown type');
  });
});

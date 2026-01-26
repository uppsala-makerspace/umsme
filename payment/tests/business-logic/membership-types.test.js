/**
 * Membership Type Tests (TYPE)
 *
 * Tests for correct membership creation based on payment type.
 */

import assert from 'assert';
import {
  clearTestData,
  createTestMember,
  processPayment,
} from './helpers';

describe('Membership Type Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('TYPE-001: memberBase creates member type, not family, not discounted', async function () {
    const memberId = await createTestMember();

    const membership = await processPayment(memberId, 'memberBase', 300);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'member');
    assert.strictEqual(membership.family, false);
    assert.strictEqual(membership.discount, false);
  });

  it('TYPE-002: memberDiscountedBase creates member type, not family, discounted', async function () {
    const memberId = await createTestMember();

    const membership = await processPayment(memberId, 'memberDiscountedBase', 150);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'member');
    assert.strictEqual(membership.family, false);
    assert.strictEqual(membership.discount, true);
  });

  it('TYPE-003: memberLab creates labandmember type, not family, not discounted', async function () {
    const memberId = await createTestMember();

    const membership = await processPayment(memberId, 'memberLab', 1200);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'labandmember');
    assert.strictEqual(membership.family, false);
    assert.strictEqual(membership.discount, false);
    assert.ok(membership.labend, 'Lab end should be set');
    assert.ok(membership.memberend, 'Member end should be set');
  });

  it('TYPE-004: memberDiscountedLab creates labandmember type, not family, discounted', async function () {
    const memberId = await createTestMember();

    const membership = await processPayment(memberId, 'memberDiscountedLab', 600);

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

    const membership = await processPayment(memberId, 'memberQuarterlyLab', 350);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'lab');
    assert.strictEqual(membership.family, false);
    assert.strictEqual(membership.discount, false);
    assert.ok(membership.labend, 'Lab end should be set');
  });

  it('TYPE-006: familyBase creates member type, family, not discounted', async function () {
    const memberId = await createTestMember();

    const membership = await processPayment(memberId, 'familyBase', 500);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'member');
    assert.strictEqual(membership.family, true);
    assert.strictEqual(membership.discount, false);
  });

  it('TYPE-007: familyLab creates labandmember type, family, not discounted', async function () {
    const memberId = await createTestMember();

    const membership = await processPayment(memberId, 'familyLab', 1400);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'labandmember');
    assert.strictEqual(membership.family, true);
    assert.strictEqual(membership.discount, false);
    assert.ok(membership.labend, 'Lab end should be set');
    assert.ok(membership.memberend, 'Member end should be set');
  });
});

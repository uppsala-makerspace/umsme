/**
 * Family Switching Tests (FAMILY)
 *
 * Tests for S3-S4 family switching scenarios from MEMBERSHIP_RULES.md.
 *
 * S3: Regular -> Family
 *   - Within the renewal window: an ordinary renewal that flips the family flag
 *   - Earlier than that it is an upgrade: S3a/S3b buy 14 months at the full
 *     family price (the same terms as the S1 lab upgrade), S3d tops up a lab
 *     membership for the difference with the dates untouched, and only S3c
 *     (lab -> familyBase) is refused with FAMILY_UPGRADE_TOO_EARLY
 *
 * S4: Family -> Regular
 *   - Allowed: Payment within the renewal window before memberend
 *   - ERROR if earlier than the renewal window: FAMILY_DOWNGRADE_TOO_EARLY
 */

import assert from 'assert';
import { Members } from '/imports/common/collections/members';
import {
  clearTestData,
  createTestMember,
  processPayment,
} from './helpers';

/**
 * Helper to add days to a date
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Helper to add months to a date
 */
function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Assert two dates are the same day (tolerates the clock moving during a test).
 */
function assertSameDay(actual, expected, label) {
  const diffDays = Math.abs(actual.getTime() - expected.getTime()) / (24 * 60 * 60 * 1000);
  assert.ok(
    diffDays < 1,
    `${label}: expected ~${expected.toISOString()}, got ${actual.toISOString()}`
  );
}

describe('Family Switching Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('FAMILY-001 (S3 allowed): Regular->Family within renewal window of memberend succeeds', async function () {
    // Regular member with membership ending in 10 days (within renewal window)
    const memberEnd = addDays(new Date(), 10);
    const memberId = await createTestMember({ member: memberEnd, family: false });

    const membership = await processPayment(memberId, 'familyBase', 500);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.family, true, 'Should be family membership');
  });

  it('FAMILY-002 (S3c error): lab member -> familyBase earlier than renewal window returns error', async function () {
    // S3c is the one refused family switch outside the window: giving up an
    // active lab would mean paying for less than you already have. Base members
    // may upgrade to family at any time (FAMILY-005/006).
    const memberEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({
      member: memberEnd,
      lab: memberEnd,
      family: false,
    });

    const membership = await processPayment(memberId, 'familyBase', 500);

    // Should NOT create membership
    assert.ok(!membership, 'No membership should be created');

    // Member should have paymentError set
    const member = await Members.findOneAsync(memberId);
    assert.strictEqual(member.paymentError, 'FAMILY_UPGRADE_TOO_EARLY');
  });

  it('FAMILY-003 (S4 allowed): Family->Regular within renewal window of memberend succeeds', async function () {
    // Family member with membership ending in 10 days (within renewal window)
    const memberEnd = addDays(new Date(), 10);
    const memberId = await createTestMember({ member: memberEnd, family: true });

    const membership = await processPayment(memberId, 'memberBase', 300);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.family, false, 'Should not be family membership');
  });

  it('FAMILY-005 (S3a upgrade): base member -> familyBase mid-period gets 14 months from now', async function () {
    // Base membership ending in 6 months, no lab: well outside the window.
    const memberEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: memberEnd, family: false });

    const membership = await processPayment(memberId, 'familyBase', 300);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.family, true, 'Should be family membership');
    assert.strictEqual(membership.type, 'member');
    assertSameDay(membership.memberend, addMonths(new Date(), 14), 'memberend');
  });

  it('FAMILY-006 (S3b upgrade): base member -> familyLab mid-period gets 14 months for both', async function () {
    const memberEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: memberEnd, family: false });

    const membership = await processPayment(memberId, 'familyLab', 2000);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.family, true, 'Should be family membership');
    assert.strictEqual(membership.type, 'labandmember');
    // Same 14 months as the S1 lab upgrade.
    assertSameDay(membership.memberend, addMonths(new Date(), 14), 'memberend');
    assert.strictEqual(
      membership.labend.getTime(),
      membership.memberend.getTime(),
      'labend should equal memberend'
    );
  });

  it('FAMILY-007 (S3d upgrade): lab member -> toFamilyLab keeps the existing end dates', async function () {
    const memberEnd = addMonths(new Date(), 6);
    const labEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({
      member: memberEnd,
      lab: labEnd,
      family: false,
    });

    const membership = await processPayment(memberId, 'toFamilyLab', 400);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.family, true, 'Should be family membership');
    assert.strictEqual(membership.type, 'labandmember');
    assert.strictEqual(membership.discount, false, 'Full-price family membership');
    assert.strictEqual(
      membership.memberend.getTime(),
      memberEnd.getTime(),
      'memberend should be unchanged'
    );
    assert.strictEqual(
      membership.labend.getTime(),
      labEnd.getTime(),
      'labend should be unchanged'
    );
  });

  it('FAMILY-008 (S3d error): toFamilyLab without an active lab returns error', async function () {
    const memberEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: memberEnd, family: false });

    const membership = await processPayment(memberId, 'toFamilyLab', 400);

    assert.ok(!membership, 'No membership should be created');
    const member = await Members.findOneAsync(memberId);
    assert.strictEqual(member.paymentError, 'FAMILY_LAB_UPGRADE_NOT_APPLICABLE');
  });

  it('FAMILY-004 (S4 error): Family->Regular earlier than renewal window returns error', async function () {
    // Family member with membership ending in 6 months (well outside the renewal window)
    const memberEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: memberEnd, family: true });

    const membership = await processPayment(memberId, 'memberBase', 300);

    // Should NOT create membership
    assert.ok(!membership, 'No membership should be created');

    // Member should have paymentError set
    const member = await Members.findOneAsync(memberId);
    assert.strictEqual(member.paymentError, 'FAMILY_DOWNGRADE_TOO_EARLY');
  });
});

/**
 * Family Switching Tests (FAMILY)
 *
 * Tests for S3-S4 family switching scenarios from MEMBERSHIP_RULES.md.
 *
 * S3: Regular -> Family
 *   - Allowed: Payment within 14 days of memberend
 *   - ERROR if > 14 days before memberend: FAMILY_UPGRADE_TOO_EARLY
 *
 * S4: Family -> Regular
 *   - Allowed: Payment within 14 days of memberend
 *   - ERROR if > 14 days before memberend: FAMILY_DOWNGRADE_TOO_EARLY
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

describe('Family Switching Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('FAMILY-001 (S3 allowed): Regular->Family within 14 days of memberend succeeds', async function () {
    // Regular member with membership ending in 10 days (within 14 day window)
    const memberEnd = addDays(new Date(), 10);
    const memberId = await createTestMember({ member: memberEnd, family: false });

    const membership = await processPayment(memberId, 'familyBase', 500);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.family, true, 'Should be family membership');
  });

  it('FAMILY-002 (S3 error): Regular->Family > 14 days before memberend returns error', async function () {
    // Regular member with membership ending in 6 months (way more than 14 days)
    const memberEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: memberEnd, family: false });

    const membership = await processPayment(memberId, 'familyBase', 500);

    // Should NOT create membership
    assert.ok(!membership, 'No membership should be created');

    // Member should have paymentError set
    const member = await Members.findOneAsync(memberId);
    assert.strictEqual(member.paymentError, 'FAMILY_UPGRADE_TOO_EARLY');
  });

  it('FAMILY-003 (S4 allowed): Family->Regular within 14 days of memberend succeeds', async function () {
    // Family member with membership ending in 10 days (within 14 day window)
    const memberEnd = addDays(new Date(), 10);
    const memberId = await createTestMember({ member: memberEnd, family: true });

    const membership = await processPayment(memberId, 'memberBase', 300);

    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.family, false, 'Should not be family membership');
  });

  it('FAMILY-004 (S4 error): Family->Regular > 14 days before memberend returns error', async function () {
    // Family member with membership ending in 6 months (way more than 14 days)
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

/**
 * Error Case Tests (ERROR)
 *
 * Tests for error handling mechanics. These verify that when an error
 * condition is detected:
 * - Payment IS created (for audit trail)
 * - Membership is NOT created
 * - paymentError IS set on member object
 */

import assert from 'assert';
import { Payments } from '/imports/common/collections/payments';
import { Memberships } from '/imports/common/collections/memberships';
import { Members } from '/imports/common/collections/members';
import {
  clearTestData,
  createTestMember,
  processPayment,
} from './helpers';

/**
 * Helper to add months to a date
 */
function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

describe('Error Case Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('ERROR-001: QUARTERLY_WITHOUT_BASE_MEMBERSHIP - payment created, no membership, error set', async function () {
    // First-time member (no member date)
    const memberId = await createTestMember();

    // processPayment creates a payment and calls the API
    const membership = await processPayment(memberId, 'memberQuarterlyLab', 350);

    // Membership should NOT be created
    assert.ok(!membership, 'No membership should be created');

    // Payment SHOULD be created (audit trail)
    const paymentCount = await Payments.find({ member: memberId }).countAsync();
    assert.strictEqual(paymentCount, 1, 'Payment should be created for audit trail');

    // Error should be set on member
    const member = await Members.findOneAsync(memberId);
    assert.strictEqual(member.paymentError, 'QUARTERLY_WITHOUT_BASE_MEMBERSHIP');
  });

  it('ERROR-002: FAMILY_UPGRADE_TOO_EARLY - payment created, no membership, error set', async function () {
    // Regular member with membership ending in 6 months
    const memberEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: memberEnd, family: false });

    const membership = await processPayment(memberId, 'familyBase', 500);

    // Membership should NOT be created
    assert.ok(!membership, 'No membership should be created');

    // Payment SHOULD be created (audit trail)
    const paymentCount = await Payments.find({ member: memberId }).countAsync();
    assert.strictEqual(paymentCount, 1, 'Payment should be created for audit trail');

    // Error should be set on member
    const member = await Members.findOneAsync(memberId);
    assert.strictEqual(member.paymentError, 'FAMILY_UPGRADE_TOO_EARLY');
  });

  it('ERROR-003: FAMILY_DOWNGRADE_TOO_EARLY - payment created, no membership, error set', async function () {
    // Family member with membership ending in 6 months
    const memberEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: memberEnd, family: true });

    const membership = await processPayment(memberId, 'memberBase', 300);

    // Membership should NOT be created
    assert.ok(!membership, 'No membership should be created');

    // Payment SHOULD be created (audit trail)
    const paymentCount = await Payments.find({ member: memberId }).countAsync();
    assert.strictEqual(paymentCount, 1, 'Payment should be created for audit trail');

    // Error should be set on member
    const member = await Members.findOneAsync(memberId);
    assert.strictEqual(member.paymentError, 'FAMILY_DOWNGRADE_TOO_EARLY');
  });
});

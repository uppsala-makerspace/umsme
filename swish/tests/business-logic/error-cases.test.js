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
  postCallback,
  clearTestData,
  createTestMember,
  createInitiatedPayment,
} from '../test-helpers';

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
    const swishId = 'error-001-' + Date.now();

    await createInitiatedPayment(memberId, swishId, 'memberQuarterlyLab', 350);

    const response = await postCallback({
      id: swishId,
      status: 'PAID',
      amount: 350,
      payerAlias: '46701234567',
      datePaid: new Date().toISOString(),
    });

    assert.strictEqual(response.status, 200, 'Should return 200 to prevent Swish retries');

    // Payment SHOULD be created (audit trail)
    const payment = await Payments.findOneAsync({ swishID: swishId });
    assert.ok(payment, 'Payment should be created for audit trail');
    assert.strictEqual(payment.member, memberId);

    // Membership should NOT be created
    const membershipCount = await Memberships.find({ mid: memberId }).countAsync();
    assert.strictEqual(membershipCount, 0, 'No membership should be created');

    // Error should be set on member
    const member = await Members.findOneAsync(memberId);
    assert.strictEqual(member.paymentError, 'QUARTERLY_WITHOUT_BASE_MEMBERSHIP');
  });

  it('ERROR-002: FAMILY_UPGRADE_TOO_EARLY - payment created, no membership, error set', async function () {
    // Regular member with membership ending in 6 months
    const memberEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: memberEnd, family: false });
    const swishId = 'error-002-' + Date.now();

    await createInitiatedPayment(memberId, swishId, 'familyBase', 500);

    const response = await postCallback({
      id: swishId,
      status: 'PAID',
      amount: 500,
      payerAlias: '46701234567',
      datePaid: new Date().toISOString(),
    });

    assert.strictEqual(response.status, 200, 'Should return 200 to prevent Swish retries');

    // Payment SHOULD be created (audit trail)
    const payment = await Payments.findOneAsync({ swishID: swishId });
    assert.ok(payment, 'Payment should be created for audit trail');
    assert.strictEqual(payment.member, memberId);

    // Membership should NOT be created
    const membershipCount = await Memberships.find({ mid: memberId }).countAsync();
    assert.strictEqual(membershipCount, 0, 'No membership should be created');

    // Error should be set on member
    const member = await Members.findOneAsync(memberId);
    assert.strictEqual(member.paymentError, 'FAMILY_UPGRADE_TOO_EARLY');
  });

  it('ERROR-003: FAMILY_DOWNGRADE_TOO_EARLY - payment created, no membership, error set', async function () {
    // Family member with membership ending in 6 months
    const memberEnd = addMonths(new Date(), 6);
    const memberId = await createTestMember({ member: memberEnd, family: true });
    const swishId = 'error-003-' + Date.now();

    await createInitiatedPayment(memberId, swishId, 'memberBase', 300);

    const response = await postCallback({
      id: swishId,
      status: 'PAID',
      amount: 300,
      payerAlias: '46701234567',
      datePaid: new Date().toISOString(),
    });

    assert.strictEqual(response.status, 200, 'Should return 200 to prevent Swish retries');

    // Payment SHOULD be created (audit trail)
    const payment = await Payments.findOneAsync({ swishID: swishId });
    assert.ok(payment, 'Payment should be created for audit trail');
    assert.strictEqual(payment.member, memberId);

    // Membership should NOT be created
    const membershipCount = await Memberships.find({ mid: memberId }).countAsync();
    assert.strictEqual(membershipCount, 0, 'No membership should be created');

    // Error should be set on member
    const member = await Members.findOneAsync(memberId);
    assert.strictEqual(member.paymentError, 'FAMILY_DOWNGRADE_TOO_EARLY');
  });
});

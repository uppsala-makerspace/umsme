/**
 * Test helpers for business logic tests
 */

import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { addPayment, processPayment as processPaymentApi } from '/server/api/payments';

// Re-export shared helpers for convenience
export { clearTestData, createTestMember } from '../test-helpers';

/**
 * Process a payment directly via the payments API (for business logic tests).
 * This bypasses the Swish HTTP callback mechanism.
 *
 * @param {string} memberId - The member's _id
 * @param {string} paymentType - The payment type key (e.g., 'memberBase', 'memberLab')
 * @param {number} amount - The payment amount
 * @returns {Promise<Object|null>} The created membership, or null if not created
 */
export async function processPayment(memberId, paymentType, amount = 300) {
  const member = await Members.findOneAsync(memberId);
  if (!member) {
    throw new Error(`Member not found: ${memberId}`);
  }

  const payment = await addPayment({
    type: 'swish',
    amount,
    date: new Date(),
    name: member.name,
    mobile: member.mobile,
    member: memberId,
  });

  await processPaymentApi(payment, member, paymentType);

  return Memberships.findOneAsync({ mid: memberId });
}

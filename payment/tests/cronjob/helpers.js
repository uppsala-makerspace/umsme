/**
 * Test helpers for cron job tests
 */

import { initiatedPayments } from '/imports/common/collections/initiatedPayments';

// Re-export shared helpers for convenience
export { clearTestData, createTestMember } from '../test-helpers';

/**
 * Create an initiated payment with a specific createdAt timestamp
 */
export async function createInitiatedPaymentWithDate(memberId, externalId, paymentType, createdAt) {
  await initiatedPayments.insertAsync({
    externalId,
    member: memberId,
    paymentType,
    amount: '300',
    status: 'INITIATED',
    createdAt,
  });
}

/**
 * Wait for a specified number of milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

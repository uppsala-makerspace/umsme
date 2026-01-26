/**
 * Test helpers for Swish HTTP endpoint tests
 */

import { initiatedPayments } from '/imports/common/collections/initiatedPayments';

// Re-export shared helpers for convenience
export { clearTestData, createTestMember } from '../test-helpers';

export const BASE_URL = 'http://localhost:3004';

/**
 * POST a callback to the swish endpoint
 */
export async function postCallback(body) {
  const response = await fetch(`${BASE_URL}/swish/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
}

/**
 * Create an initiated payment for testing
 */
export async function createInitiatedPayment(memberId, externalId, paymentType, amount = 300) {
  await initiatedPayments.insertAsync({
    externalId,
    member: memberId,
    paymentType,
    amount: String(amount),
    status: 'CREATED',
    createdAt: new Date(),
  });
}

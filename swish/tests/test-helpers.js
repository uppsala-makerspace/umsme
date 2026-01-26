/**
 * Shared test helpers for swish tests
 */

import { Payments } from '/imports/common/collections/payments';
import { initiatedPayments } from '/imports/common/collections/initiatedPayments';
import { Memberships } from '/imports/common/collections/memberships';
import { Members } from '/imports/common/collections/members';

export const BASE_URL = 'http://localhost:3004';

/**
 * Generate a unique member ID (required by schema)
 */
let memberCounter = 0;
export function generateMemberId() {
  memberCounter++;
  return `T${Date.now().toString(36).slice(-5)}${memberCounter}`;
}

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
 * Clear all test data from collections
 */
export async function clearTestData() {
  await Payments.removeAsync({});
  await initiatedPayments.removeAsync({});
  await Memberships.removeAsync({});
  await Members.removeAsync({});
}

/**
 * Create a test member with proper required fields
 * @param {Object} overrides - Fields to override/add
 * @returns {string} The MongoDB _id of the created member
 */
export async function createTestMember(overrides = {}) {
  const mid = overrides.mid || generateMemberId();
  const memberId = await Members.insertAsync({
    mid,
    name: 'Test Member',
    email: 'test@example.com',
    mobile: '46701234567',
    ...overrides,
    mid, // Ensure mid can't be overridden by spread if explicitly set
  });
  return memberId;
}

/**
 * Create an initiated payment for testing
 */
export async function createInitiatedPayment(memberId, swishId, paymentType, amount = 300) {
  await initiatedPayments.insertAsync({
    swishID: swishId,
    member: memberId,
    paymentType,
    amount: String(amount),
    status: 'CREATED',
    createdAt: new Date(),
  });
}

/**
 * Process a complete payment flow (create initiated payment + post callback)
 */
export async function processPayment(memberId, swishId, paymentType, amount = 300) {
  await createInitiatedPayment(memberId, swishId, paymentType, amount);

  await postCallback({
    id: swishId,
    status: 'PAID',
    amount,
    payerAlias: '46701234567',
    datePaid: new Date().toISOString(),
  });

  return Memberships.findOneAsync({ mid: memberId });
}

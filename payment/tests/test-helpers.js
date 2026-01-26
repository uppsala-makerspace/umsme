/**
 * Shared test helpers used by both swish and business-logic tests
 */

import { Payments } from '/imports/common/collections/payments';
import { initiatedPayments } from '/imports/common/collections/initiatedPayments';
import { Memberships } from '/imports/common/collections/memberships';
import { Members } from '/imports/common/collections/members';

/**
 * Generate a unique member ID (required by schema)
 */
let memberCounter = 0;
export function generateMemberId() {
  memberCounter++;
  return `T${Date.now().toString(36).slice(-5)}${memberCounter}`;
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

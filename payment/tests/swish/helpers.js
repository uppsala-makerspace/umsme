/**
 * Test helpers for Swish HTTP endpoint tests
 */

import { initiatedPayments } from '/imports/common/collections/initiatedPayments';
import { StoreItems } from '/imports/common/collections/storeItems';

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
 * @returns {string} The _id of the created initiatedPayment
 */
export async function createInitiatedPayment(memberId, externalId, paymentType, amount = 300) {
  return await initiatedPayments.insertAsync({
    externalId,
    member: memberId,
    paymentType,
    amount: String(amount),
    status: 'CREATED',
    createdAt: new Date(),
  });
}

/**
 * Create an initiated webshop purchase for testing. `kind: 'storeItem'` is what
 * sends the callback down the purchase branch instead of the membership one.
 */
export async function createInitiatedPurchase(memberId, externalId, item, { amount = 150, comment } = {}) {
  return await initiatedPayments.insertAsync({
    externalId,
    member: memberId,
    amount: String(amount),
    status: 'CREATED',
    createdAt: new Date(),
    kind: 'storeItem',
    storeItem: item._id,
    itemCode: item.code,
    ...(comment ? { comment } : {}),
  });
}

/** Insert a store item, returning the doc so its _id and code are to hand. */
export async function createTestStoreItem(overrides = {}) {
  const doc = {
    code: overrides.code || 'test',
    name: { sv: 'Testvara' },
    price: 150,
    requiresMembership: false,
    commentRequired: false,
    bookkeepingAccount: '3030',
    status: 'available',
    createdAt: new Date(),
    ...overrides,
  };
  const _id = await StoreItems.insertAsync(doc);
  return { _id, ...doc };
}

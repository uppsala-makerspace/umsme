/**
 * Idempotency Tests (IDEM)
 *
 * Tests for correct handling of duplicate callbacks.
 */

import assert from 'assert';
import { Payments } from '/imports/common/collections/payments';
import { Memberships } from '/imports/common/collections/memberships';
import {
  postCallback,
  clearTestData,
  createTestMember,
  createInitiatedPayment,
} from './helpers';

describe('Idempotency Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('IDEM-001: Duplicate PAID callback does not create second payment', async function () {
    const memberId = await createTestMember();
    const swishId = 'idem-001-' + Date.now();

    await createInitiatedPayment(memberId, swishId, 'memberBase', 300);

    const callbackBody = {
      id: swishId,
      status: 'PAID',
      amount: 300,
      payerAlias: '46701234567',
      datePaid: new Date().toISOString(),
    };

    // First callback
    const response1 = await postCallback(callbackBody);
    assert.strictEqual(response1.status, 200);

    // Second (duplicate) callback
    const response2 = await postCallback(callbackBody);
    assert.strictEqual(response2.status, 200);

    // Only one payment should exist
    const paymentCount = await Payments.find({ externalId: swishId }).countAsync();
    assert.strictEqual(paymentCount, 1, 'Only one payment should be created');
  });

  it('IDEM-002: Duplicate PAID callback does not create second membership', async function () {
    const memberId = await createTestMember();
    const swishId = 'idem-002-' + Date.now();

    await createInitiatedPayment(memberId, swishId, 'memberBase', 300);

    const callbackBody = {
      id: swishId,
      status: 'PAID',
      amount: 300,
      payerAlias: '46701234567',
      datePaid: new Date().toISOString(),
    };

    // First callback
    await postCallback(callbackBody);

    // Second (duplicate) callback
    await postCallback(callbackBody);

    // Only one membership should exist
    const membershipCount = await Memberships.find({ mid: memberId }).countAsync();
    assert.strictEqual(membershipCount, 1, 'Only one membership should be created');
  });
});

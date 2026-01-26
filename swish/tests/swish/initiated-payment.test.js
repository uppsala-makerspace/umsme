/**
 * Initiated Payment Tests (INIT)
 *
 * Tests for callback behavior when a matching initiatedPayment exists.
 */

import assert from 'assert';
import { Payments } from '/imports/common/collections/payments';
import { initiatedPayments } from '/imports/common/collections/initiatedPayments';
import { Memberships } from '/imports/common/collections/memberships';
import {
  postCallback,
  clearTestData,
  createTestMember,
  createInitiatedPayment,
} from '../test-helpers';

describe('Initiated Payment Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('INIT-001: PAID callback with matching initiatedPayment creates payment and membership', async function () {
    const memberId = await createTestMember();
    const swishId = 'init-001-' + Date.now();

    await createInitiatedPayment(memberId, swishId, 'memberBase', 300);

    const response = await postCallback({
      id: swishId,
      status: 'PAID',
      amount: 300,
      payerAlias: '46701234567',
      datePaid: new Date().toISOString(),
    });

    assert.strictEqual(response.status, 200);

    // Verify payment created
    const payment = await Payments.findOneAsync({ swishID: swishId });
    assert.ok(payment, 'Payment should be created');
    assert.strictEqual(payment.member, memberId);
    assert.strictEqual(payment.amount, 300);

    // Verify membership created
    const membership = await Memberships.findOneAsync({ mid: memberId });
    assert.ok(membership, 'Membership should be created');
    assert.strictEqual(membership.type, 'member');
  });

  it('INIT-002: PAID callback updates initiatedPayment status to PAID', async function () {
    const memberId = await createTestMember();
    const swishId = 'init-002-' + Date.now();

    await createInitiatedPayment(memberId, swishId, 'memberBase', 300);

    await postCallback({
      id: swishId,
      status: 'PAID',
      amount: 300,
      payerAlias: '46701234567',
      datePaid: new Date().toISOString(),
    });

    const initiated = await initiatedPayments.findOneAsync({ swishID: swishId });
    assert.strictEqual(initiated.status, 'PAID');
  });

  it('INIT-003: CANCELLED callback updates initiatedPayment status', async function () {
    const memberId = await createTestMember();
    const swishId = 'init-003-' + Date.now();

    await createInitiatedPayment(memberId, swishId, 'memberBase', 300);

    const response = await postCallback({
      id: swishId,
      status: 'CANCELLED',
    });

    assert.strictEqual(response.status, 200);

    const initiated = await initiatedPayments.findOneAsync({ swishID: swishId });
    assert.strictEqual(initiated.status, 'CANCELLED');

    // No payment should be created
    const paymentCount = await Payments.find({}).countAsync();
    assert.strictEqual(paymentCount, 0);
  });

  it('INIT-004: DECLINED callback updates initiatedPayment with error info', async function () {
    const memberId = await createTestMember();
    const swishId = 'init-004-' + Date.now();

    await createInitiatedPayment(memberId, swishId, 'memberBase', 300);

    const response = await postCallback({
      id: swishId,
      status: 'DECLINED',
      errorCode: 'DS01',
      errorMessage: 'User declined the payment',
    });

    assert.strictEqual(response.status, 200);

    const initiated = await initiatedPayments.findOneAsync({ swishID: swishId });
    assert.strictEqual(initiated.status, 'DECLINED');
    assert.strictEqual(initiated.errorCode, 'DS01');
    assert.strictEqual(initiated.errorMessage, 'User declined the payment');
  });

  it('INIT-005: ERROR callback updates initiatedPayment with error info', async function () {
    const memberId = await createTestMember();
    const swishId = 'init-005-' + Date.now();

    await createInitiatedPayment(memberId, swishId, 'memberBase', 300);

    const response = await postCallback({
      id: swishId,
      status: 'ERROR',
      errorCode: 'RP03',
      errorMessage: 'Request timeout',
    });

    assert.strictEqual(response.status, 200);

    const initiated = await initiatedPayments.findOneAsync({ swishID: swishId });
    assert.strictEqual(initiated.status, 'ERROR');
    assert.strictEqual(initiated.errorCode, 'RP03');
    assert.strictEqual(initiated.errorMessage, 'Request timeout');
  });
});

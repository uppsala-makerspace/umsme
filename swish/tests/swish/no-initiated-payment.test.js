/**
 * No Initiated Payment Tests
 *
 * Tests for callback behavior when no matching initiatedPayment exists.
 */

import assert from 'assert';
import { Payments } from '/imports/common/collections/payments';
import { initiatedPayments } from '/imports/common/collections/initiatedPayments';
import { Memberships } from '/imports/common/collections/memberships';

const BASE_URL = 'http://localhost:3004';

async function postCallback(body) {
  const response = await fetch(`${BASE_URL}/swish/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, text: await response.text() };
}

async function clearTestData() {
  await Payments.removeAsync({});
  await initiatedPayments.removeAsync({});
  await Memberships.removeAsync({});
}

describe('No Initiated Payment Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('NIP-001: PAID callback creates orphan payment with externalId', async function () {
    const swishId = 'test-orphan-' + Date.now();
    const callbackBody = {
      id: swishId,
      status: 'PAID',
      amount: 200,
      payerAlias: '46701234567',
      datePaid: new Date().toISOString(),
    };

    const response = await postCallback(callbackBody);

    assert.strictEqual(response.status, 200, 'Expected 200 response');
    assert.strictEqual(response.text, 'Callback processed');

    const payment = await Payments.findOneAsync({ externalId: swishId });
    assert.ok(payment, 'Payment should be created');
    assert.strictEqual(payment.type, 'swish');
    assert.strictEqual(payment.amount, 200);
    assert.strictEqual(payment.mobile, '46701234567');
    assert.strictEqual(payment.externalId, swishId);
    assert.strictEqual(payment.member, undefined, 'Orphan payment should not have member');

    const membershipCount = await Memberships.find({}).countAsync();
    assert.strictEqual(membershipCount, 0, 'No membership should be created');
  });

  it('NIP-002: CANCELLED callback with no initiatedPayment returns 200', async function () {
    const swishId = 'test-cancelled-' + Date.now();
    const response = await postCallback({ id: swishId, status: 'CANCELLED' });

    assert.strictEqual(response.status, 200);
    const paymentCount = await Payments.find({}).countAsync();
    assert.strictEqual(paymentCount, 0, 'No payment should be created');
  });

  it('NIP-003: DECLINED callback with no initiatedPayment returns 200', async function () {
    const swishId = 'test-declined-' + Date.now();
    const response = await postCallback({
      id: swishId,
      status: 'DECLINED',
      errorCode: 'DS01',
      errorMessage: 'User declined',
    });

    assert.strictEqual(response.status, 200);
    const paymentCount = await Payments.find({}).countAsync();
    assert.strictEqual(paymentCount, 0, 'No payment should be created');
  });

  it('NIP-004: ERROR callback with no initiatedPayment returns 200', async function () {
    const swishId = 'test-error-' + Date.now();
    const response = await postCallback({
      id: swishId,
      status: 'ERROR',
      errorCode: 'RP03',
      errorMessage: 'Timeout',
    });

    assert.strictEqual(response.status, 200);
    const paymentCount = await Payments.find({}).countAsync();
    assert.strictEqual(paymentCount, 0, 'No payment should be created');
  });
});

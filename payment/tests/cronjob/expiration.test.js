/**
 * Expiration tests (EXP)
 *
 * Tests for the function that expires stale initiated payments
 * (`expireStaleInitiatedPayments` in /imports/common/server/expireInitiatedPayments).
 * The function is invoked here directly. The corresponding cron registration
 * lives in admin/server/cronjob/expireInitiatedPayments.js and is verified
 * separately in admin's runtime.
 */

import assert from 'assert';
import { initiatedPayments } from '/imports/common/collections/initiatedPayments';
import { expireStaleInitiatedPayments } from '/imports/common/server/expireInitiatedPayments';
import {
  clearTestData,
  createTestMember,
  createInitiatedPaymentWithDate,
} from './helpers';

const TEST_PAYMENT_TYPE = 'testPayment';
const OTHER_PAYMENT_TYPE = 'otherPayment';
const EXPIRY_SECONDS = 2;

describe('Expiration Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('EXP-001: Stale initiated payment gets expired', async function () {
    const memberId = await createTestMember();
    const externalId = 'exp-001-' + Date.now();

    // Create an initiated payment with createdAt 5 seconds in the past
    const oldDate = new Date(Date.now() - 5000);
    await createInitiatedPaymentWithDate(memberId, externalId, TEST_PAYMENT_TYPE, oldDate);

    let initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'INITIATED');

    await expireStaleInitiatedPayments({
      paymentType: TEST_PAYMENT_TYPE,
      expirySeconds: EXPIRY_SECONDS,
    });

    initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'EXPIRED', 'Stale payment should be expired');
    assert.ok(initiated.resolvedAt, 'resolvedAt should be set');
  });

  it('EXP-002: Initiated payment of non-configured type is not expired', async function () {
    const memberId = await createTestMember();
    const externalId = 'exp-002-' + Date.now();

    const oldDate = new Date(Date.now() - 5000);
    await createInitiatedPaymentWithDate(memberId, externalId, OTHER_PAYMENT_TYPE, oldDate);

    let initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'INITIATED');

    await expireStaleInitiatedPayments({
      paymentType: TEST_PAYMENT_TYPE,
      expirySeconds: EXPIRY_SECONDS,
    });

    initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'INITIATED', 'Payment of other type should not be expired');
    assert.ok(!initiated.resolvedAt, 'resolvedAt should not be set');
  });

  it('EXP-003: Recent initiated payment is not expired', async function () {
    const memberId = await createTestMember();
    const externalId = 'exp-003-' + Date.now();

    // createdAt = now → newer than (now - expirySeconds)
    await createInitiatedPaymentWithDate(memberId, externalId, TEST_PAYMENT_TYPE, new Date());

    let initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'INITIATED');

    await expireStaleInitiatedPayments({
      paymentType: TEST_PAYMENT_TYPE,
      expirySeconds: EXPIRY_SECONDS,
    });

    initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'INITIATED', 'Recent payment should not be expired');
    assert.ok(!initiated.resolvedAt, 'resolvedAt should not be set');
  });

  it('EXP-004: Already resolved payments are not affected', async function () {
    const memberId = await createTestMember();
    const externalId = 'exp-004-' + Date.now();

    const oldDate = new Date(Date.now() - 5000);
    const resolvedDate = new Date(Date.now() - 4000);
    await initiatedPayments.insertAsync({
      externalId,
      member: memberId,
      paymentType: TEST_PAYMENT_TYPE,
      amount: '300',
      status: 'PAID',
      createdAt: oldDate,
      resolvedAt: resolvedDate,
    });

    await expireStaleInitiatedPayments({
      paymentType: TEST_PAYMENT_TYPE,
      expirySeconds: EXPIRY_SECONDS,
    });

    const initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'PAID', 'Already resolved payment should not be changed');
    assert.strictEqual(
      initiated.resolvedAt.getTime(),
      resolvedDate.getTime(),
      'resolvedAt should not be changed'
    );
  });
});

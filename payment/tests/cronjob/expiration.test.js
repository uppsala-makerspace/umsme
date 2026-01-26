/**
 * Expiration Cron Job Tests (EXP)
 *
 * Tests for the background job that expires stale initiated payments.
 * Uses a test-specific payment type "testPayment" configured in tests/settings.json.
 *
 * Test settings use:
 * - paymentType: "testPayment"
 * - expiryMs: 2000 (2 seconds)
 * - recurrenceSeconds: 1 (every second)
 */

import assert from 'assert';
import { initiatedPayments } from '/imports/common/collections/initiatedPayments';
import {
  clearTestData,
  createTestMember,
  createInitiatedPaymentWithDate,
  sleep,
} from './helpers';

// Payment type configured for expiration in test settings
const TEST_PAYMENT_TYPE = 'testPayment';
const OTHER_PAYMENT_TYPE = 'otherPayment';

describe('Expiration Cron Job Tests', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('EXP-001: Stale initiated payment gets expired by cron job', async function () {
    const memberId = await createTestMember();
    const externalId = 'exp-001-' + Date.now();

    // Create an initiated payment with createdAt 5 seconds in the past
    const oldDate = new Date(Date.now() - 5000);
    await createInitiatedPaymentWithDate(memberId, externalId, TEST_PAYMENT_TYPE, oldDate);

    // Verify it starts as INITIATED
    let initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'INITIATED');

    // Wait for cron job to run (configured for 1 second recurrence, 2 second expiry)
    await sleep(3000);

    // Verify it's now EXPIRED
    initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'EXPIRED', 'Stale payment should be expired');
    assert.ok(initiated.resolvedAt, 'resolvedAt should be set');
  });

  it('EXP-002: Initiated payment of non-configured type is not expired', async function () {
    const memberId = await createTestMember();
    const externalId = 'exp-002-' + Date.now();

    // Create an initiated payment of a different type with old createdAt
    const oldDate = new Date(Date.now() - 5000);
    await createInitiatedPaymentWithDate(memberId, externalId, OTHER_PAYMENT_TYPE, oldDate);

    // Verify it starts as INITIATED
    let initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'INITIATED');

    // Wait for cron job to run
    await sleep(3000);

    // Verify it's still INITIATED (not expired because it's not the configured type)
    initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'INITIATED', 'Payment of other type should not be expired');
    assert.ok(!initiated.resolvedAt, 'resolvedAt should not be set');
  });

  it('EXP-003: Recent initiated payment is not expired', async function () {
    const memberId = await createTestMember();
    const externalId = 'exp-003-' + Date.now();

    // Create an initiated payment with current timestamp (not stale)
    await createInitiatedPaymentWithDate(memberId, externalId, TEST_PAYMENT_TYPE, new Date());

    // Verify it starts as INITIATED
    let initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'INITIATED');

    // Wait for cron job to run (but not long enough for the payment to become stale)
    await sleep(1500);

    // Verify it's still INITIATED (not expired because it's too recent)
    initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'INITIATED', 'Recent payment should not be expired yet');
    assert.ok(!initiated.resolvedAt, 'resolvedAt should not be set');
  });

  it('EXP-004: Already resolved payments are not affected', async function () {
    const memberId = await createTestMember();
    const externalId = 'exp-004-' + Date.now();

    // Create an initiated payment that's already PAID
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

    // Wait for cron job to run
    await sleep(3000);

    // Verify it's still PAID (not changed to EXPIRED)
    const initiated = await initiatedPayments.findOneAsync({ externalId });
    assert.strictEqual(initiated.status, 'PAID', 'Already resolved payment should not be changed');
    assert.strictEqual(initiated.resolvedAt.getTime(), resolvedDate.getTime(), 'resolvedAt should not be changed');
  });
});

/**
 * Webshop purchase callbacks (WS)
 *
 * A purchase takes the same route as a membership payment up to the point where
 * swish.js branches on initiatedPayment.kind. From there it must record the item
 * on the payment and create no membership at all.
 */

import assert from 'assert';
import { Payments } from '/imports/common/collections/payments';
import { Memberships } from '/imports/common/collections/memberships';
import { initiatedPayments } from '/imports/common/collections/initiatedPayments';
import {
  postCallback,
  clearTestData,
  createTestMember,
  createInitiatedPayment,
  createInitiatedPurchase,
  createTestStoreItem,
} from './helpers';

const paidBody = (swishId, amount) => ({
  id: swishId,
  status: 'PAID',
  amount,
  payerAlias: '46701234567',
  datePaid: new Date().toISOString(),
  paymentReference: `REF-${swishId}`,
});

describe('Webshop purchase callbacks', function () {
  this.timeout(10000);

  beforeEach(async function () {
    await clearTestData();
  });

  it('WS-001: links the payment to the item and creates no membership', async function () {
    const memberId = await createTestMember();
    const item = await createTestStoreItem({ code: 'tshirt', price: 150 });
    const swishId = 'ws-001-' + Date.now();
    await createInitiatedPurchase(memberId, swishId, item, { amount: 150 });

    const res = await postCallback(paidBody(swishId, 150));
    assert.strictEqual(res.status, 200);

    const payments = await Payments.find({ member: memberId }).fetchAsync();
    assert.strictEqual(payments.length, 1);
    assert.strictEqual(payments[0].storeItem, item._id);
    assert.strictEqual(payments[0].itemCode, 'tshirt');
    assert.strictEqual(payments[0].amount, 150);
    // The whole point of the branch: a purchase is not a membership.
    assert.strictEqual(payments[0].membership, undefined);
    assert.strictEqual(await Memberships.find({ mid: memberId }).countAsync(), 0);
  });

  it('WS-002: carries the buyer comment onto the payment', async function () {
    const memberId = await createTestMember();
    const item = await createTestStoreItem({ code: 'kurs', price: 300, commentRequired: true });
    const swishId = 'ws-002-' + Date.now();
    await createInitiatedPurchase(memberId, swishId, item, {
      amount: 300,
      comment: 'Anna Andersson',
    });

    await postCallback(paidBody(swishId, 300));

    const payment = await Payments.findOneAsync({ member: memberId });
    assert.strictEqual(payment.comment, 'Anna Andersson');
  });

  it('WS-003: omits comment rather than storing an empty one', async function () {
    const memberId = await createTestMember();
    const item = await createTestStoreItem({ code: 'lera' });
    const swishId = 'ws-003-' + Date.now();
    await createInitiatedPurchase(memberId, swishId, item, { amount: 85 });

    await postCallback(paidBody(swishId, 85));

    const payment = await Payments.findOneAsync({ member: memberId });
    assert.strictEqual(payment.comment, undefined);
  });

  it('WS-004: marks the initiated payment PAID like any other', async function () {
    const memberId = await createTestMember();
    const item = await createTestStoreItem({ code: 'tshirt' });
    const swishId = 'ws-004-' + Date.now();
    await createInitiatedPurchase(memberId, swishId, item);

    await postCallback(paidBody(swishId, 150));

    const initiated = await initiatedPayments.findOneAsync({ externalId: swishId });
    assert.strictEqual(initiated.status, 'PAID');
    assert.ok(initiated.resolvedAt instanceof Date);
  });

  it('WS-005: a duplicate callback does not create a second purchase', async function () {
    const memberId = await createTestMember();
    const item = await createTestStoreItem({ code: 'tshirt' });
    const swishId = 'ws-005-' + Date.now();
    await createInitiatedPurchase(memberId, swishId, item);

    await postCallback(paidBody(swishId, 150));
    await postCallback(paidBody(swishId, 150));

    assert.strictEqual(await Payments.find({ member: memberId }).countAsync(), 1);
  });

  it('WS-006: charges the amount Swish reports, not the one requested', async function () {
    // The initiated amount is what we asked for; the callback amount is what was
    // actually paid, and that is what gets booked.
    const memberId = await createTestMember();
    const item = await createTestStoreItem({ code: 'gava', price: undefined });
    const swishId = 'ws-006-' + Date.now();
    await createInitiatedPurchase(memberId, swishId, item, { amount: 100 });

    await postCallback(paidBody(swishId, 100));

    const payment = await Payments.findOneAsync({ member: memberId });
    assert.strictEqual(payment.amount, 100);
  });

  it('WS-007: a membership payment is untouched by the purchase branch', async function () {
    // Guards the branch itself: an initiatedPayment without kind defaults to
    // membership, so old records must still create a membership.
    const memberId = await createTestMember();
    const swishId = 'ws-007-' + Date.now();
    await createInitiatedPayment(memberId, swishId, 'memberBase', 300);

    await postCallback(paidBody(swishId, 300));

    const payment = await Payments.findOneAsync({ member: memberId });
    assert.strictEqual(payment.storeItem, undefined);
    assert.ok(payment.membership, 'a membership payment should still get a membership');
    assert.strictEqual(await Memberships.find({ mid: memberId }).countAsync(), 1);
  });

  it('WS-008: a cancelled purchase records the status and no payment', async function () {
    const memberId = await createTestMember();
    const item = await createTestStoreItem({ code: 'tshirt' });
    const swishId = 'ws-008-' + Date.now();
    await createInitiatedPurchase(memberId, swishId, item);

    const res = await postCallback({ id: swishId, status: 'CANCELLED' });
    assert.strictEqual(res.status, 200);

    const initiated = await initiatedPayments.findOneAsync({ externalId: swishId });
    assert.strictEqual(initiated.status, 'CANCELLED');
    assert.strictEqual(await Payments.find({ member: memberId }).countAsync(), 0);
  });
});

/**
 * Swish payment callback handler.
 * Handles HTTP requests from Swish and delegates payment processing to payments.js.
 */

import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import bodyParser from "body-parser";
import { initiatedPayments } from "/imports/common/collections/initiatedPayments";
import { Members } from "/imports/common/collections/members";
import { addPayment, processPayment } from "./payments";

WebApp.handlers.use(bodyParser.json());

// Handle JSON parsing errors
WebApp.handlers.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.log('[Swish] Invalid JSON in request body');
    res.writeHead(400);
    res.end('Invalid JSON');
    return;
  }
  next(err);
});

WebApp.handlers.use("/swish/callback", async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`[Swish] Rejected ${req.method} request`);
    res.writeHead(405);
    res.end('Only POST is supported');
    return;
  }

  const obj = req.body;

  // Validate request body
  if (!obj || typeof obj !== 'object') {
    console.log('[Swish] Invalid request body');
    res.writeHead(400);
    res.end('Invalid request body');
    return;
  }

  // Optional: Validate callbackIdentifier if configured
  const expectedIdentifier = Meteor.settings?.swish?.expectedCallbackIdentifier;
  if (expectedIdentifier && obj.callbackIdentifier !== expectedIdentifier) {
    console.log(`[Swish] Invalid callbackIdentifier: ${obj.callbackIdentifier}`);
    res.writeHead(403);
    res.end('Invalid callback identifier');
    return;
  }

  const { id, status } = obj;
  console.log(`[Swish] Received callback: id=${id}, status=${status}`);

  try {
    // Find the initiated payment
    const initiated = await initiatedPayments.findOneAsync({ externalId: id });

    // Handle different status types
    switch (status) {
      case 'PAID':
        await handlePaidStatus(obj, initiated);
        break;

      case 'ERROR':
      case 'CANCELLED':
      case 'DECLINED':
        await handleFailedStatus(obj, initiated, status);
        break;

      default:
        console.log(`[Swish] Unknown status: ${status}`);
    }

    // Always return 200 to prevent Swish retries
    res.writeHead(200);
    res.end('Callback processed');

  } catch (err) {
    console.error('[Swish] Error processing callback:', err);
    res.writeHead(500);
    res.end('Internal server error');
  }
});

/**
 * Handle PAID status callback
 */
async function handlePaidStatus(obj, initiated) {
  const { id, datePaid, amount, payerAlias } = obj;

  // Check if already processed (idempotency)
  if (initiated?.status === 'PAID') {
    console.log(`[Swish] Payment ${id} already processed, skipping`);
    return;
  }

  if (!initiated) {
    // Orphan payment - create payment record for manual matching
    console.warn(`[Swish] No initiated payment found for externalId: ${id}, creating orphan payment`);
    await createOrphanPayment(obj);
    return;
  }

  // Update initiated payment status
  await initiatedPayments.updateAsync(
    { externalId: id },
    { $set: { status: "PAID", resolvedAt: new Date(datePaid) } }
  );

  // Find member
  const member = await Members.findOneAsync(initiated.member);
  if (!member) {
    console.error(`[Swish] Member not found: ${initiated.member}`);
    // Still create payment record
    const payment = await addPayment({
      type: "swish",
      amount: Number(initiated.amount),
      date: new Date(datePaid),
      externalId: id,
    });
    console.warn(`[Swish] Created payment ${payment._id} without member`);
    return;
  }

  // Create payment record
  const payment = await addPayment({
    type: "swish",
    amount: Number(initiated.amount),
    date: new Date(datePaid),
    name: member.name,
    mobile: member.mobile,
    member: member._id,
    externalId: id,
  });
  console.log(`[Swish] Created payment ${payment._id} for member ${member._id}`);

  // Process payment and create membership if paymentType is recognized
  const membershipResult = await processPayment(payment, member, initiated.paymentType);
  if (membershipResult) {
    if (membershipResult.error) {
      console.warn(`[Swish] Payment processed but membership not created due to error: ${membershipResult.error}`);
    } else {
      console.log(`[Swish] Created membership ${membershipResult.id} for member ${member._id}`);
    }
  } else {
    console.warn(`[Swish] Unknown paymentType: ${initiated.paymentType}, not creating membership`);
  }
}

/**
 * Handle ERROR, CANCELLED, or DECLINED status
 */
async function handleFailedStatus(obj, initiated, status) {
  const { id, errorCode, errorMessage } = obj;

  if (!initiated) {
    console.warn(`[Swish] No initiated payment found for failed callback: ${id}, status: ${status}`);
    return;
  }

  // Update initiated payment with failure status
  const updateData = {
    status,
    resolvedAt: new Date(),
    ...(errorCode && { errorCode }),
    ...(errorMessage && { errorMessage }),
  };

  await initiatedPayments.updateAsync(
    { externalId: id },
    { $set: updateData }
  );

  console.log(`[Swish] Updated initiated payment ${id} to status: ${status}`);
}

/**
 * Create orphan payment record for manual matching
 */
async function createOrphanPayment(obj) {
  const { id, datePaid, amount, payerAlias } = obj;

  const payment = await addPayment({
    type: "swish",
    amount: Number(amount),
    date: new Date(datePaid),
    mobile: payerAlias,
    externalId: id,
  });

  console.warn(`[Swish] Created orphan payment ${payment._id} with externalId ${id} for manual matching`);
  return payment;
}

/*
 * Swish callback examples from: https://developer.swish.nu/documentation/guides/create-a-payment-request
 *
 * Example of a successful response:
 * {
 *   "id": "0902D12C7FAE43D3AAAC49622AA79FEF",
 *   "payeePaymentReference": "0123456789",
 *   "paymentReference": "652ED6A2BCDE4BA8AD11D7334E9567B7",
 *   "callbackUrl": "https://example.com/api/swishcb/paymentrequests",
 *   "payerAlias": "46712347689",
 *   "payeeAlias": "1234679304",
 *   "amount": 100.00,
 *   "currency": "SEK",
 *   "message": "payment test",
 *   "status": "PAID",
 *   "dateCreated": "2022-04-13T09:05:32.717Z",
 *   "datePaid": "2022-04-13T09:05:36.717Z",
 *   "errorCode": null,
 *   "errorMessage": null
 * }
 *
 * Status can be: PAID, ERROR, CANCELLED, or DECLINED
 */

/**
 * The Swish plumbing shared by membership payments and webshop purchases: read
 * the configuration, check the callback host is alive, and turn an
 * initiatedPayment into a Swish payment request.
 *
 * Extracted from payments.js when the webshop arrived — the ~50 lines of request
 * building and error recording are identical for both, only the amount and the
 * message differ.
 */
import { Meteor } from "meteor/meteor";
import { fetch } from "meteor/fetch";
import { getSwishClient } from "./swish-client.js";
import { initiatedPayments } from "/imports/common/collections/initiatedPayments.js";

const PAYMENT_SERVICE_TIMEOUT_MS = 3000;

export const getSwishConfig = () => {
  const config = Meteor.settings?.private?.swish;
  if (!config) {
    throw new Meteor.Error("config-error", "Swish is not configured");
  }
  return config;
};

export const isSwishDisabled = () =>
  Meteor.settings?.public?.swish?.disabled === true;

const formatError = (status, errArr) => {
  const swishErrs = errArr.map((errObj) => {
    const additional = errObj.additionalInformation == '' ? '' : `; ${errObj.additionalInformation}`;
    return `${errObj.errorMessage} (${errObj.errorCode})${additional}`;
  });

  return `HTTP status: ${status}, Swish: ${swishErrs.join(', ')}`;
};

/**
 * Probe the payment service's /status endpoint, derived from the same host Swish
 * would call back into. Throws Meteor.Error('payment-service-unavailable') if the
 * service is unreachable, slow, or returns a non-2xx response. Called before
 * initiating so the user gets a clean "try later" instead of paying through Swish
 * and having the callback land on a dead host.
 */
export const checkPaymentServiceAlive = async () => {
  const config = getSwishConfig();
  if (!config.callbackUrl) {
    throw new Meteor.Error(
      "payment-service-unavailable",
      "No callback URL configured"
    );
  }
  let statusUrl;
  try {
    statusUrl = new URL("/status", new URL(config.callbackUrl).origin).toString();
  } catch (err) {
    throw new Meteor.Error(
      "payment-service-unavailable",
      `Invalid callback URL: ${err.message}`
    );
  }
  try {
    const res = await fetch(statusUrl, {
      method: "GET",
      signal: AbortSignal.timeout(PAYMENT_SERVICE_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Meteor.Error(
        "payment-service-unavailable",
        `Status ${res.status}`
      );
    }
  } catch (err) {
    if (err instanceof Meteor.Error) throw err;
    throw new Meteor.Error("payment-service-unavailable", err.message);
  }
};

/**
 * Create the Swish payment request for an already-inserted initiatedPayment.
 *
 * On failure the initiatedPayment is marked ERROR with the reason before the
 * error is rethrown, so a stuck INITIATED record always has an explanation.
 *
 * @param {object} args
 * @param {string} args.externalId  the initiatedPayment's externalId
 * @param {number} args.amount      kronor
 * @param {string} args.message     already passed through sanitizeForSwish
 * @return {Promise<{paymentrequesttoken: string, externalId: string, amount: number}>}
 */
export const requestSwishPayment = async ({ externalId, amount, message }) => {
  const config = getSwishConfig();
  const data = {
    callbackUrl: config.callbackUrl,
    payeeAlias: config.payeeAlias,
    currency: "SEK",
    amount: amount.toString(),
    message,
  };

  const fail = async (reason) => {
    await initiatedPayments.updateAsync(
      { externalId },
      { $set: { status: "ERROR", error: reason } }
    );
  };

  try {
    const swishClient = await getSwishClient();
    const response = await swishClient.put(
      `${config.api.paymentRequest}/${externalId}`,
      data
    );

    if (response.status !== 201) {
      await fail("Unexpected response status");
      throw new Meteor.Error("payment-failed", "Failed to create payment request");
    }

    return {
      paymentrequesttoken: response.headers.paymentrequesttoken,
      externalId,
      amount,
    };
  } catch (error) {
    if (error instanceof Meteor.Error) throw error;

    // The message must be built outside the branch that produces it: it was
    // previously declared with `const` inside an `else` and read after it, so
    // every failure threw "errorMessage is not defined" and the initiatedPayment
    // was left INITIATED with no explanation.
    const reason = error.response
      ? `Swish payment initiation error: ${formatError(error.status, error.response.data)}`
      : `Swish payment initiation failed: ${error.message}`;
    console.error(reason);
    await fail(reason);
    throw new Meteor.Error("payment-error", "Failed to initiate payment");
  }
};

import { Meteor } from "meteor/meteor";
import { v4 as uuidv4 } from "uuid";
import { getSwishClient } from "./swish-client.js";
import { Buffer } from "buffer";
import { check, Match } from "meteor/check";
import { initiatedPayments } from "/imports/common/collections/initiatedPayments.js";
import { findMemberForUser } from "/server/methods/utils";
import fs from "fs";
import path from "path";

// Get the app root directory (where meteor was started from)
const appRoot = process.env.PWD;

// Lazy-loaded payment options
let _paymentOptions = null;
let _paymentTypes = null;

/**
 * Get payment options from configuration file.
 * Lazy-loaded on first access.
 */
const getPaymentOptions = () => {
  if (!_paymentOptions) {
    const configPath = Meteor.settings?.private?.paymentOptionsPath;
    if (!configPath) {
      throw new Meteor.Error("config-error", "Payment options path not configured");
    }
    try {
      const fullPath = path.resolve(appRoot, configPath);
      const text = fs.readFileSync(fullPath, "utf8");
      _paymentOptions = JSON.parse(text);
    } catch (err) {
      console.error("Failed to load payment options config:", err);
      throw new Meteor.Error("config-error", "Failed to load payment options");
    }
  }
  return _paymentOptions;
};

/**
 * Get payment types as a map of paymentType -> option object.
 * Lazy-loaded on first access.
 */
const getPaymentTypes = () => {
  if (!_paymentTypes) {
    const options = getPaymentOptions();
    _paymentTypes = options.reduce((acc, opt) => {
      acc[opt.paymentType] = opt;
      return acc;
    }, {});
  }
  return _paymentTypes;
};

/**
 * Get Swish configuration from settings
 * @throws {Meteor.Error} if Swish is not configured
 */
const getSwishConfig = () => {
  const config = Meteor.settings?.private?.swish;
  if (!config) {
    throw new Meteor.Error("config-error", "Swish is not configured");
  }
  return config;
};

Meteor.methods({
  /**
   * Get payment options configuration.
   * @returns {Object} The payment options config with all options
   */
  "payment.getOptions"() {
    return getPaymentOptions();
  },

  /**
   * Initiate a Swish payment.
   *
   * @param {string} paymentType - The type of payment (e.g., "memberBase", "memberLab")
   * @returns {Object} Object with paymentrequesttoken, externalId, and deepLink
   */
  async "payment.initiate"(paymentType) {
    check(paymentType, String);

    // Validate payment type
    const paymentTypes = getPaymentTypes();
    if (!paymentTypes[paymentType]) {
      throw new Meteor.Error("invalid-type", "Invalid payment type");
    }

    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("member-not-found", "No member record found");
    }

    if (!member.name) {
      throw new Meteor.Error("no-name", "Member name is required");
    }

    const config = getSwishConfig();
    const { amount } = paymentTypes[paymentType];
    const externalId = uuidv4().replace(/-/g, "").toUpperCase();

    // Create initiated payment record
    await initiatedPayments.insertAsync({
      externalId,
      member: member._id,
      status: "INITIATED",
      amount,
      createdAt: new Date(),
      paymentType
    });

    const data = {
      callbackUrl: config.callbackUrl,
      payeeAlias: config.payeeAlias,
      currency: "SEK",
      amount: amount.toString(),
      message: `pt:${paymentType} mid:${member.mid} ${member.name}`,
      //callbackIdentifier
    };

    try {
      const swishClient = await getSwishClient();
      const response = await swishClient.put(
        `${config.api.paymentRequest}/${externalId}`,
        data
      );

      if (response.status === 201) {
        const { paymentrequesttoken } = response.headers;

        return {
          paymentrequesttoken,
          externalId,
          amount
        };
      } else {
        // Update payment status on failure
        await initiatedPayments.updateAsync(
          { externalId },
          { $set: { status: "ERROR", error: "Unexpected response status" } }
        );
        throw new Meteor.Error("payment-failed", "Failed to create payment request");
      }
    } catch (error) {
      console.error("Swish payment initiation error:", error);

      // Update payment status on error
      await initiatedPayments.updateAsync(
        { externalId },
        { $set: { status: "ERROR", error: error.message } }
      );

      if (error instanceof Meteor.Error) {
        throw error;
      }
      throw new Meteor.Error("payment-error", "Failed to initiate payment");
    }
  },

  /**
   * Get QR code image for a Swish payment.
   *
   * @param {string} token - The payment request token
   * @returns {string} Base64-encoded PNG image data URL
   */
  async "payment.getQrCode"(token) {
    check(token, String);

    const config = getSwishConfig();

    const data = {
      token,
      size: 300,
      format: "png",
      border: "0",
    };

    try {
      const swishClient = await getSwishClient();
      const response = await swishClient.post(
        config.api.qrCode,
        data,
        { responseType: "arraybuffer" }
      );

      if (response.status === 200) {
        const base64 = Buffer.from(response.data, "binary").toString("base64");
        return `data:image/png;base64,${base64}`;
      }

      throw new Meteor.Error("qr-failed", "Failed to generate QR code");
    } catch (error) {
      console.error("QR code generation error:", error);
      if (error instanceof Meteor.Error) {
        throw error;
      }
      throw new Meteor.Error("qr-error", "Failed to generate QR code");
    }
  },

  /**
   * Get payment status by external ID.
   *
   * @param {string} externalId - The payment external ID
   * @returns {Object} Payment status object
   */
  async "payment.getStatus"(externalId) {
    check(externalId, String);

    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("member-not-found", "No member record found");
    }

    const payment = await initiatedPayments.findOneAsync({
      externalId,
      member: member._id,
    });

    if (!payment) {
      throw new Meteor.Error("payment-not-found", "Payment not found");
    }

    return {
      status: payment.status,
      amount: payment.amount,
      paymentType: payment.paymentType,
      createdAt: payment.createdAt,
      resolvedAt: payment.resolvedAt,
      error: payment.error,
    };
  },

  async getQrCode(token) {
    check(token, String);
    return Meteor.callAsync("payment.getQrCode", token);
  },

  async getPaymentStatus(instructionId) {
    check(instructionId, String);
    const payment = await initiatedPayments.findOneAsync({
      externalId: instructionId,
    });
    if (!payment) {
      throw new Meteor.Error("payment-not-found", "Ingen betalning hittades.");
    }
    if (payment.status === "PAID") {
      return true;
    }
    return false;
  },
});

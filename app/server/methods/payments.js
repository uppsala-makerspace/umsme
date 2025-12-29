import { Meteor } from "meteor/meteor";
import { Members } from "/imports/common/collections/members";
import { v4 as uuidv4 } from "uuid";
import { swishClient } from "./swish-client.js";
import { Buffer } from "buffer";
import { check } from "meteor/check";
import { initiatedPayments } from "/imports/common/collections/initiatedPayments.js";
import Invites from "/imports/common/collections/Invites";

const findForUser = async () => {
  let user;
  let email;
  let verified;
  let member;
  let invite;
  if (Meteor.userId()) {
    user = await Meteor.userAsync();
    const firstEmail = user?.emails?.[0];
    if (firstEmail) {
      email = firstEmail?.address;
      verified = firstEmail.verified;
      if (verified) {
        member = await Members.findOneAsync({email});
        if (!member) {
          invite = await Invites.findOneAsync({email});
        }
      }
    }
  }
  return {user, email, verified, member, invite};
};

const findMemberForUser = async () => {
  const { member } = await findForUser();
  return member;
};

Meteor.methods({
  async "swish.createTestPayment"(price, membershipType) {
    const instructionId = uuidv4().replace(/-/g, "").toUpperCase();

    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("member-not-found", "Ingen medlem hittades.");
    }

    initiatedPayments.insertAsync({
      swishID: instructionId,
      member: member._id,
      status: "INITIATED",
      amount: price,
      createdAt: new Date(),
      paymentType: membershipType,
    });
    const callBack = Meteor.settings.swishCallback;

    const data = {
      //payeePaymentReference: "0123456789",
      callbackUrl: callBack,
      payeeAlias: "9871065216", // testnummer från filen aliases
      currency: "SEK",
      //payerAlias: "46464646464", // testnummer från filen aliases
      amount: price.toString(),
      message: "Testbetalning via Meteor",
    };

    try {
      const response = await swishClient.put(
        `https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests/${instructionId}`,
        data
      );

      if (response.status === 201) {
        const { paymentrequesttoken } = response.headers;
        return { paymentrequesttoken, instructionId };
      } else {
        throw new Meteor.Error("payment-failed", "Did not get 201 status");
      }
    } catch (error) {
      console.error(error);
    }
  },

  async getQrCode(token) {
    const data = {
      token,
      size: 300,
      format: "png",
      border: "0",
    };
    try {
      const response = await swishClient.post(
        "https://mpc.getswish.net/qrg-swish/api/v1/commerce",
        data,
        { responseType: "arraybuffer" }
      );
      if (response.status === 200) {
        const base64 = Buffer.from(response.data, "binary").toString("base64");
        return `data:image/png;base64,${base64}`;
      }
    } catch (error) {
      console.error(error);
    }
  },

  async getPaymentStatus(instructionId) {
    //denna ska anropas av gränssnittet i payment
    check(instructionId, String);
    const payment = await initiatedPayments.findOneAsync({
      swishID: instructionId,
    });
    if (!payment) {
      throw new Meteor.Error("payment-not-found", "Ingen betalning hittades.");
    }
    if (payment.status === "PAID") {
      return true;
    }
  },
});

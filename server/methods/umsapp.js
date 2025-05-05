import { Meteor } from "meteor/meteor";
import { Members } from "/collections/members";
import { Memberships } from "/collections/memberships";
import { v4 as uuidv4 } from "uuid";
import { swishClient } from "../swish-client.js";
import { Buffer } from "buffer";
import { Payments } from "/collections/payments";
import { check, Match } from "meteor/check";
import { Random } from "meteor/random";
import { initiatedPayments } from "/collections/initiatedPayments.js";
import { PendingMembers } from "/collections/PendingMembers.js";

const findMemberForUser = async () => {
  if (Meteor.userId()) {
    const user = await Meteor.userAsync();
    const email = user?.emails?.[0]?.address;
    if (user?.emails?.[0]?.verified) {
      return Members.findOneAsync({ email });
    }
  }
};

Meteor.methods({
  findMemberForUser: findMemberForUser,
  findMembershipsForUser: async () => {
    const member = await findMemberForUser();
    return Memberships.find({ mid: member._id }).fetchAsync();
  },
  findInfoForUser: async () => {
    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error(
        "not-found",
        "Ingen medlem hittades för användaren"
      );
    }
    const memberships = await Memberships.find({
      mid: member._id,
    }).fetchAsync();
    memberships.sort((m1, m2) => (m1.memberend > m2.memberend ? -1 : 1));
    let familyHead;
    if (member.infamily) {
      familyHead = await Memberships.findOneAsync({ mid: member.infamily });
    }
    const familyId = member.infamily || member._id;
    const familyMembers = await Members.find({
      $or: [
        { infamily: familyId }, // barn i familjen
        { _id: familyId }, // familjehuvudet
      ],
    }).fetchAsync();
    return { member, memberships, familyHead, familyMembers };
  },

  async "swish.createTestPayment"(price) {
    const instructionId = uuidv4().replace(/-/g, "").toUpperCase();

    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("member-not-found", "Ingen medlem hittades.");
    }
    initiatedPayments.insertAsync({
      swishID: instructionId,
      member: member,
      status: "INITIATED",
      amount: price,
      createdAt: new Date(),
    });

    const data = {
      //payeePaymentReference: "0123456789",
      callbackUrl: "https://50f4-31-209-41-143.ngrok-free.app/swish/callback",
      payeeAlias: "9871065216", // testnummer från filen aliases
      currency: "SEK",
      //payerAlias: "46464646464", // testnummer från filen aliases
      amount: price.toString(),
      message: "Testbetalning via Meteor",
    };

    //const v2url = `https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests/${instructionId}`;

    //await swishClient.put(v2url, data);
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

  async getPaymentStatusAndInsertMembership(instructionId) {
    check(instructionId, String);
    const maxRetries = 50;
    const delay = 1000;

    for (let i = 0; i < maxRetries; i++) {
      const payment = await initiatedPayments.findOneAsync({
        swishID: instructionId,
      });

      if (!payment) {
        throw new Meteor.Error("not-found", "Betalningen hittades inte");
      }

      if (payment.status === "PAID") {
        const member = await findMemberForUser();
        await Meteor.callAsync("addMembership", {
          mid: member._id,
          amount: Number(payment.amount),
          start: payment.createdAt,
          type: "member",
          discount: false,
          family: false,
        });
        const membership = await Meteor.call("findMembershipsForUser");
        await Meteor.callAsync("addPayment", {
          type: "swish",
          amount: Number(payment.amount),
          date: payment.createdAt,
          name: member.name,
          mobile: member.mobile,
          member: member._id,
          membership: membership[0]?.mid,
        });
        console.log(payment.status)
        return payment.status; // Returnera status om den är PAID
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    throw new Meteor.Error(
      "timeout",
      "Betalningsstatusen är fortfarande inte PAID efter 50 sekunder"
    );
  },

  async savePendingMember(data) {
    check(data, {
      name: String,
      email: String,
      mobile: String,
      youth: Boolean,
    });
    const existing = await PendingMembers.findOneAsync({ email: data.email });
    if (existing) {
      throw new Meteor.Error(
        "already-pending",
        "E-postadressen är redan registrerad."
      );
    }

    console.log("Sparar PendingMember:", data);
    return PendingMembers.insertAsync(data);
  },
  async createMemberFromPending() {
    if (!this.userId) throw new Meteor.Error("not-authorized");

    const user = await Meteor.userAsync();
    const email = user?.emails?.[0]?.address;
    const verified = user?.emails?.[0]?.verified;

    if (!email || !verified)
      throw new Meteor.Error("not-verified", "E-post är inte verifierad");

    const pending = await PendingMembers.findOneAsync({ email });
    if (!pending)
      throw new Meteor.Error("not-found", "Ingen pending member hittad");

    //i think this is unnecessary, but just in case
    const existing = await Members.findOneAsync({ email });
    if (existing) return { _id: existing._id, mid: existing.mid };

    const mid = Random.id(10);

    const member = {
      name: pending.name,
      email: pending.email,
      mobile: pending.mobile,
      youth: pending.youth,
      mid,
    };

    const memberId = await Members.insertAsync(member);
    await PendingMembers.removeAsync({ _id: pending._id });

    return { _id: memberId, mid };
  },

  addPayment(paymentData) {

    check(paymentData, {
      type: String,
      amount: Match.OneOf(String, Number),
      date: Date,
      message: Match.Optional(String),
      name: Match.Optional(String),
      mobile: Match.Optional(String),
      other: Match.Optional(Boolean),
      clarification: Match.Optional(String),
      member: Match.Optional(String),
      membership: Match.Optional(String),
    });

    if (!this.userId) {
      throw new Meteor.Error("not-authorized");
    }

    const hash = uuidv4().replace(/-/g, "").substring(0, 40);

    try {
      const id = Payments.insertAsync({
        ...paymentData,
        date: new Date(), // Se till att nödvändiga fält finns
        hash,
      });
      return paymentData;
    } catch (error) {
      console.error("Failed to insert payment:", error);
      throw new Meteor.Error("insert-failed", "Could not insert payment");
    }
  },

  async addMembership(membershipData) {
    check(membershipData, {
      mid: String,
      pid: Match.Maybe(String),
      amount: Match.Maybe(Number),

      start: Date,
      type: String,
      discount: Match.Maybe(Boolean),
      family: Match.Maybe(Boolean),
      memberend: Match.Maybe(Date),
      labend: Match.Maybe(Date),
    });

    if (!membershipData.memberend) {
      const end = new Date(membershipData.start);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() + 7);
      membershipData.memberend = end;
    }

    const membershipId = await Memberships.insertAsync(membershipData);

    return {
      id: membershipId,
      mid: membershipData.mid,
    };
  },
});

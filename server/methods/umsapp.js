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
    console.log("member.infamily, ", member.infamily);
    if (member.infamily) {
      familyHead = await Members.findOneAsync({ mid: member.infamily });
      console.log("familyHead", familyHead);
    }
    let familyHeadMembership;
    if (familyHead) {
      familyHeadMembership = await Memberships.findOneAsync({
        mid: familyHead._id,
      });
    }
    const familyId = member.infamily || member.mid;
    const familyMembers = await Members.find({
      $or: [
        { infamily: familyId }, // barn i familjen
        { mid: familyId }, // familjehuvudet
      ],
    }).fetchAsync();
    return { member, memberships, familyHeadMembership, familyMembers };
  },

  findPendingMemberForUser: async () => {
    if (Meteor.userId()) {
      const user = await Meteor.userAsync();
      const email = user?.emails?.[0]?.address;
      const pendingMember = await PendingMembers.findOneAsync({ email });
      return !!pendingMember;
    }
    return false;
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
      callbackUrl: "https://3eb4-31-209-40-149.ngrok-free.app/swish/callback",
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

  async getPaymentStatusAndInsertMembership(instructionId, membershipType) {
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
        await Meteor.callAsync(
          "addMembership",
          {
            mid: member._id,
            amount: Number(payment.amount),
            start: payment.createdAt,
            type: membershipType,
            discount: false,
            family: false,
          },
          instructionId
        );
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
        console.log(payment.status);
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
    console.log("Sparar pendingMember, server side", data);
    check(data, {
      name: String,
      email: String,
      mobile: String,
      youth: Boolean,
      mid: Match.Optional(String),
      infamily: Match.Optional(String),
      family: Match.Optional(Boolean),
      //add option to include family head membership
    });
    const existing = await PendingMembers.findOneAsync({ email: data.email });
    if (existing) {
      throw new Meteor.Error(
        "already-pending",
        "E-postadressen är redan registrerad."
      );
    }

    // code to make sure that the family does not have more than 3 children, avoiding infinite families
    // we should also check if the person adding the family should be authorized to do this, in the event that infamily is included
    if (data.infamily) {
      const existingFamilyMembers = await PendingMembers.find({
        infamily: data.infamily,
      }).countAsync();

      const confirmedFamilyMembers = await Members.find({
        infamily: data.infamily,
      }).countAsync();

      const total = existingFamilyMembers + confirmedFamilyMembers;

      if (total >= 3) {
        throw new Meteor.Error(
          "family-limit-reached",
          "Denna familj har redan tre medlemmar registrerade."
        );
      }
    }

    console.log("Sparar PendingMember:", data);
    return PendingMembers.insertAsync(data);
  },
  async createMemberFromPending() {
    console.log("Skapar medlem från pending, serve side");
    if (!this.userId) throw new Meteor.Error("not-authorized");

    const user = await Meteor.userAsync();
    const email = user?.emails?.[0]?.address;
    const verified = user?.emails?.[0]?.verified;

    if (!email || !verified)
      throw new Meteor.Error("not-verified", "E-post är inte verifierad");

    const pending = await PendingMembers.findOneAsync({ email });
    if (!pending)
      throw new Meteor.Error("not-found", "Ingen pending member hittad");

    const existing = await Members.findOneAsync({ email });
    if (existing) return { _id: existing._id, mid: existing.mid };

    const mid_new = Random.id(10);

    const member = {
      name: pending.name,
      email: pending.email,
      mobile: pending.mobile,
      youth: pending.youth,
      mid: pending.mid || mid_new, //TODO this is unnecessary i am pretty sure
      infamily: pending.infamily,
      family: pending.family,
    };

    const memberId = await Members.insertAsync(member);
    await PendingMembers.removeAsync({ _id: pending._id });

    return { mid: memberId };
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

  async addMembership(membershipData, instructionId) {
    const payment = await initiatedPayments.findOneAsync({
      swishID: instructionId,
    });
    if (!payment) {
      throw new Meteor.Error("not-found", "Betalningen hittades inte");
    }
    if (payment.status === "PAID") {
      console.log("Lägger till medlemskap, server side", membershipData);
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
    } else if (payment.status === "INITIATED") {
      throw new Meteor.Error("not-paid", "Betalningen är inte genomförd än");
    } else {
      throw new Meteor.Error("payment-failed", "Betalningen misslyckades");
    }
  },
});

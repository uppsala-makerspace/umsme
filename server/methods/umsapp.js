import { Meteor } from "meteor/meteor";
import { Members } from "/collections/members";
import { Memberships } from "/collections/memberships";
import { v4 as uuidv4 } from "uuid";
import { swishClient } from "../swish-client.js";
import axios from "axios";
import { Payments } from "/collections/payments";
import { check, Match } from "meteor/check";
import { Random } from "meteor/random";
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

    const data = {
      payeePaymentReference: "0123456789",
      callbackUrl: "https://bd61-31-209-40-149.ngrok-free.app/swish/callback",
      payeeAlias: "9871065216", // testnummer från filen aliases
      currency: "SEK",
      payerAlias: "46464646464", // testnummer från filen aliases
      amount: price.toString(),
      message: "Testbetalning via Meteor",
    };

    const v2url = `https://mss.cpc.getswish.net/swish-cpcapi/api/v2/paymentrequests/${instructionId}`;
    const v1url = `https://mss.cpc.getswish.net/swish-cpcapi/api/v1/paymentrequests/${instructionId}`;

    await swishClient.put(v2url, data);
    await new Promise((resolve) => setTimeout(resolve, 4000)); //Wait so payment-status is PAID, will handle this differntely later, see other solution in swish.ts.dis
    const response = await swishClient.get(v1url);
    return response.data.status;
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
    console.log("👉 Trying to insert payment:", paymentData);

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
      console.log("Payment inserted with ID:", id);
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
      membershipData.memberend = end;
    }

    console.log(" Skapar membership:", membershipData);

    const membershipId = await Memberships.insertAsync(membershipData);

    return {
      id: membershipId,
      mid: membershipData.mid,
    };
  },
});

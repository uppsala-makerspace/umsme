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
    if (member.family) {
      // hitta familiyhead om man är "barn"
      familyHead = await Members.findOneAsync({ mid: member.infamily });
    } else if (memberships?.[0]?.family) {
      //Om familyhead är member
      familyHead = member;
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

  async savePendingMember(data) {
    check(data, {
      name: String,
      email: String,
      mobile: String,
      youth: Boolean,
      mid: Match.Optional(String),
      infamily: Match.Optional(String),
      family: Match.Optional(Boolean),
    });
    const existing = await PendingMembers.findOneAsync({ email: data.email });
    if (existing) {
      throw new Meteor.Error(
        "already-pending",
        "E-postadressen är redan registrerad."
      );
    }

    //if infamily: check if membershiptype is lab family and that the family is not already full
    if (data.infamily) {
      const memberships = await Meteor.callAsync("findMembershipsForUser");

      const hasLabFamilyMembership = memberships.some(
        (membership) => membership.family === true
      );

      if (!hasLabFamilyMembership) {
        throw new Meteor.Error(
          "no-lab-family-membership",
          "Användaren har inget medlemskap av typen 'Family lab member'."
        );
      }
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
});

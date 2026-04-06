import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";
import { Memberships } from "/imports/common/collections/memberships";
import { Payments } from "/imports/common/collections/payments";
import { initiatedPayments } from "/imports/common/collections/initiatedPayments";
import { findMemberForUser } from "/server/methods/utils";

Meteor.methods({
  async "membership.getDetail"(membershipId) {
    check(membershipId, String);

    const member = await findMemberForUser();
    if (!member) {
      throw new Meteor.Error("no-member", "No member record found");
    }

    const membership = await Memberships.findOneAsync(membershipId);
    if (!membership || membership.mid !== member._id) {
      throw new Meteor.Error("not-found", "Membership not found");
    }

    let payment = null;
    let initiated = null;

    if (membership.pid) {
      payment = await Payments.findOneAsync(membership.pid);
      if (payment?.initiatedBy) {
        initiated = await initiatedPayments.findOneAsync(payment.initiatedBy);
      }
    }

    return { membership, payment, initiated };
  },
});

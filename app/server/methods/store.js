import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import { v4 as uuidv4 } from "uuid";
import { StoreItems } from "/imports/common/collections/storeItems";
import { Payments } from "/imports/common/collections/payments";
import { initiatedPayments } from "/imports/common/collections/initiatedPayments.js";
import { findMemberForUser, sanitizeForSwish } from "/server/methods/utils";
import { memberStatus } from "/imports/common/lib/utils";
import { amountFor, commentFor, canBuy, swishMessageFor } from "/imports/common/lib/storeRules";
import { storeItemImageUrlFor } from "/imports/common/server/workshopImage";
import {
  isSwishDisabled,
  checkPaymentServiceAlive,
  requestSwishPayment,
} from "./swishRequest";

/**
 * The webshop: browsing items and buying one. Payment goes through Swish exactly
 * as a membership does — see plan/webshop.md. The confirmation arrives in the
 * payment service (payment/server/api/swish.js), not here.
 */

/** Everything the app needs to render an item, in both languages. */
const publicItem = (item) => ({
  _id: item._id,
  code: item.code,
  name: item.name,
  description: item.description || null,
  price: typeof item.price === "number" ? item.price : null,
  minPrice: typeof item.minPrice === "number" ? item.minPrice : null,
  maxPrice: typeof item.maxPrice === "number" ? item.maxPrice : null,
  requiresMembership: !!item.requiresMembership,
  commentRequired: !!item.commentRequired,
  commentPlaceholder: item.commentPlaceholder || null,
  imageUrl: storeItemImageUrlFor(item),
});

/**
 * Whether the member has any current membership. memberStatus computes `type`
 * against today and already resolves a family dependent through the paying
 * member, so this needs no special case for families. Lab-only counts: someone
 * with current lab access is certainly entitled to buy clay.
 */
const hasMembershipNow = async (member) => {
  const { type } = await memberStatus(member);
  return type !== "none";
};

const requireMember = async () => {
  const member = await findMemberForUser();
  if (!member) throw new Meteor.Error("member-not-found", "No member record found");
  if (member.excluded) throw new Meteor.Error("member-excluded", "membership-suspended");
  return member;
};

Meteor.methods({
  /**
   * The items on sale. Items requiring membership are listed for everyone —
   * `canBuy` tells the app to explain rather than hide, so a non-member can see
   * that clay exists and why it is out of reach.
   */
  async "store.getItems"() {
    const member = await requireMember();
    const hasMembership = await hasMembershipNow(member);
    const items = await StoreItems.find(
      { status: "available" },
      { sort: { sortOrder: 1, code: 1 } }
    ).fetchAsync();
    return items.map((item) => ({
      ...publicItem(item),
      canBuy: canBuy(item, { hasMembership }),
    }));
  },

  /** One item, by its public code. */
  async "store.getItem"(code) {
    check(code, String);
    const member = await requireMember();
    const item = await StoreItems.findOneAsync({ code, status: "available" });
    if (!item) throw new Meteor.Error("not-found", "No such item");
    return {
      ...publicItem(item),
      canBuy: canBuy(item, { hasMembership: await hasMembershipNow(member) }),
    };
  },

  /**
   * Start a purchase: validate, record an initiatedPayment, ask Swish.
   *
   * The amount is recomputed here from the item. A fixed price ignores what the
   * client sent; a buyer-set price is checked against the item's bounds. Same for
   * requiresMembership — the app hides the button as a courtesy, this is the
   * control.
   */
  async "store.initiate"(code, options) {
    check(code, String);
    check(options, Match.Optional({
      amount: Match.Optional(Match.OneOf(Number, String, null, undefined)),
      comment: Match.Optional(Match.OneOf(String, null, undefined)),
    }));
    const { amount: requestedAmount, comment: rawComment } = options || {};

    // Refuse before the buyer pays if the callback host is down, or Swish's
    // confirmation would land nowhere.
    await checkPaymentServiceAlive();
    if (isSwishDisabled()) {
      throw new Meteor.Error("swish-disabled", "Swish payments are currently disabled");
    }

    const member = await requireMember();
    if (!member.name) throw new Meteor.Error("no-name", "Member name is required");

    const item = await StoreItems.findOneAsync({ code });
    if (!item) throw new Meteor.Error("not-found", "No such item");

    if (!canBuy(item, { hasMembership: await hasMembershipNow(member) })) {
      throw new Meteor.Error(
        item.requiresMembership ? "membership-required" : "not-available",
        "This item cannot be bought"
      );
    }

    const priced = amountFor(item, requestedAmount);
    if (priced.error) throw new Meteor.Error(priced.error, "Invalid amount");
    const commented = commentFor(item, rawComment);
    if (commented.error) throw new Meteor.Error(commented.error, "Comment required");

    const externalId = uuidv4().replace(/-/g, "").toUpperCase();
    await initiatedPayments.insertAsync({
      externalId,
      member: member._id,
      status: "INITIATED",
      amount: priced.amount,
      createdAt: new Date(),
      kind: "storeItem",
      storeItem: item._id,
      itemCode: item.code,
      ...(commented.comment ? { comment: commented.comment } : {}),
    });

    return requestSwishPayment({
      externalId,
      amount: priced.amount,
      message: sanitizeForSwish(swishMessageFor(item, member)),
    });
  },

  /**
   * "My purchases": every settled payment of the member's, both purchases and
   * membership payments. The account page keeps listing memberships only.
   *
   * `membership` is carried so the app can send a membership payment to its
   * existing page and a purchase to the new one.
   */
  async "store.getMyPayments"() {
    const member = await requireMember();
    const payments = await Payments.find(
      { member: member._id },
      { sort: { date: -1 } }
    ).fetchAsync();

    const itemIds = [...new Set(payments.map((p) => p.storeItem).filter(Boolean))];
    const items = await StoreItems.find(
      { _id: { $in: itemIds } },
      { fields: { name: 1, code: 1 } }
    ).fetchAsync();
    const itemById = Object.fromEntries(items.map((i) => [i._id, i]));

    return payments.map((p) => ({
      _id: p._id,
      amount: p.amount,
      date: p.date,
      type: p.type,
      membership: p.membership || null,
      storeItem: p.storeItem || null,
      itemName: p.storeItem ? itemById[p.storeItem]?.name || null : null,
      itemCode: p.itemCode || null,
      comment: p.comment || null,
    }));
  },

  /**
   * The landing page for one purchase — the webshop's counterpart to
   * membership.getDetail. Only the member's own payment, and only a purchase: a
   * membership payment has its own page.
   */
  async "payment.getDetail"(paymentId) {
    check(paymentId, String);
    const member = await requireMember();
    const payment = await Payments.findOneAsync({ _id: paymentId, member: member._id });
    if (!payment) throw new Meteor.Error("not-found", "Payment not found");
    if (!payment.storeItem) {
      throw new Meteor.Error("not-a-purchase", "This payment is a membership payment");
    }
    const item = await StoreItems.findOneAsync(payment.storeItem);
    return {
      payment: {
        _id: payment._id,
        amount: payment.amount,
        date: payment.date,
        type: payment.type,
        comment: payment.comment || null,
        itemCode: payment.itemCode || null,
      },
      // `available` decides whether the receipt links to the item's page:
      // store.getItem only serves available items, so linking to a hidden one
      // would land the buyer on "item not found".
      item: item
        ? {
            code: item.code,
            name: item.name,
            imageUrl: storeItemImageUrlFor(item),
            available: item.status === "available",
          }
        : null,
      memberName: member.name,
    };
  },
});

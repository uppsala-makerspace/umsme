/**
 * The rules of a webshop purchase: what an item costs, who may buy it, and what
 * the buyer must fill in.
 *
 * Pure — no Meteor, no database — so the rules can be unit tested directly. The
 * wiring lives in app/server/methods/store.js.
 *
 * These are enforced on the server, never only in the UI: hiding a button is a
 * courtesy to the buyer, not a control.
 */

/** Items with no `price` let the buyer set the amount (clay by weight, a donation). */
export const hasFixedPrice = (item) => typeof item?.price === "number";

/**
 * The amount to charge, or an error code.
 *
 * A fixed price ignores whatever the client sent — the price lives on the item
 * and nowhere else. A buyer-set price is validated against the item's bounds; it
 * is a *range* the server checks, not a value the server trusts.
 *
 * @param {object} item
 * @param {number|undefined} requested  what the buyer typed, ignored for fixed prices
 * @return {{amount: number}|{error: string}}
 */
export const amountFor = (item, requested) => {
  if (!item) return { error: "no-such-item" };
  if (hasFixedPrice(item)) return { amount: item.price };

  const amount = Number(requested);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "amount-required" };
  // Swish deals in whole öre; keeping purchases to whole kronor avoids a
  // rounding argument between the app, Swish and the bookkeeping.
  if (!Number.isInteger(amount)) return { error: "amount-not-whole" };
  if (typeof item.minPrice === "number" && amount < item.minPrice) {
    return { error: "amount-too-low" };
  }
  if (typeof item.maxPrice === "number" && amount > item.maxPrice) {
    return { error: "amount-too-high" };
  }
  return { amount };
};

/**
 * Whether the comment the buyer wrote satisfies the item.
 *
 * @param {object} item
 * @param {string|undefined} comment
 * @return {{comment: string|null}|{error: string}}
 */
export const commentFor = (item, comment) => {
  const trimmed = String(comment || "").trim();
  if (item?.commentRequired && !trimmed) return { error: "comment-required" };
  return { comment: trimmed || null };
};

/**
 * Whether this member may buy this item.
 *
 * `hasMembership` is decided by the caller from memberStatus, which already
 * resolves a family member's membership through the paying member.
 *
 * @param {object} item
 * @param {{hasMembership: boolean}} buyer
 * @return {boolean}
 */
export const canBuy = (item, { hasMembership } = {}) => {
  if (!item || item.status !== "available") return false;
  if (item.requiresMembership && !hasMembership) return false;
  return true;
};

/**
 * The Swish message for a purchase.
 *
 * The code comes first so that truncation at 50 characters (sanitizeForSwish)
 * eats the buyer's name rather than the code. `ws:` rather than the memberships'
 * `pt:` so the two classes can never be read as each other — in the bank
 * statement or in the accounting match.
 *
 * The message is for humans reading a bank statement. It is NOT how a payment is
 * identified: that goes externalId -> initiatedPayment -> storeItem.
 */
export const swishMessageFor = (item, member) =>
  `ws:${item.code} mid:${member.mid} ${member.name}`;

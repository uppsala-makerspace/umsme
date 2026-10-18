/**
 * What a workshop's steering group sees of its web shop sales: a list of the
 * payments and their totals, without anything that identifies the buyer.
 *
 * Pure, so the selection and the privacy rule are tested without Meteor; the
 * method that reads the database is store.getWorkshopRevenue in the app.
 */

/** Roles that see every workshop's web shop sales. */
export const REVENUE_ROLES = ['admin', 'board', 'treasurer'];

/**
 * Who sees a workshop's web shop sales: the members of its steering group
 * (active, or its responsible), and the roles above. A pending request to join
 * is not membership, and a group of another type does not count even if the
 * workshop points at it.
 *
 * @param {{groupType: string|null, membershipState: string|null, isResponsible: boolean, hasRole: boolean}} args
 */
export const maySeeWorkshopRevenue = ({ groupType, membershipState, isResponsible, hasRole }) =>
  !!hasRole
  || (groupType === 'steering' && (!!isResponsible || membershipState === 'active'));

/** Years with any payment, newest first. */
export const revenueYears = (payments) =>
  [...new Set(payments.map((p) => new Date(p.date).getFullYear()))].sort((a, b) => b - a);

/**
 * Totals and the payment list for one workshop.
 *
 * Only date, amount, comment and the item's name leave this function: never
 * the payment's name, mobile, member or Swish message. The comment is the
 * buyer's own note to the workshop and is shown on purpose.
 *
 * @param {Array<object>} payments payments of the workshop's items
 * @param {Map<string, {name: object, sharedWith: string[]}>} itemsById the
 *   workshop's items, each with the names of the other workshops it belongs to
 * @param {number|null} year a calendar year, or null for all years
 */
export const summarizeRevenue = (payments, itemsById, year = null) => {
  const inYear = year == null
    ? payments
    : payments.filter((p) => new Date(p.date).getFullYear() === year);
  const sorted = [...inYear].sort((a, b) => new Date(b.date) - new Date(a.date));

  const perItem = new Map([...itemsById.keys()].map((id) => [id, { count: 0, total: 0 }]));
  let total = 0;
  for (const p of sorted) {
    const amount = typeof p.amount === 'number' ? p.amount : 0;
    total += amount;
    const sums = perItem.get(p.storeItem);
    if (sums) {
      sums.count += 1;
      sums.total += amount;
    }
  }

  return {
    total,
    count: sorted.length,
    items: [...itemsById.entries()].map(([id, item]) => ({
      _id: id,
      name: item.name,
      sharedWith: item.sharedWith || [],
      ...perItem.get(id),
    })),
    payments: sorted.map((p) => ({
      _id: p._id,
      date: p.date,
      amount: p.amount,
      comment: p.comment || '',
      itemId: p.storeItem,
      itemName: itemsById.get(p.storeItem)?.name,
    })),
  };
};

import { StoreItems } from '/imports/common/collections/storeItems';
import { Payments } from '/imports/common/collections/payments';
import { randomHex } from './members';

/**
 * A web shop item. Leave out `price` to let the buyer set the amount.
 *
 * @returns {Promise<string>} the item id
 */
export const makeStoreItem = ({ createdAt = new Date(), status = 'available', ...fields }) =>
  StoreItems.insertAsync({ status, createdAt, ...fields });

/**
 * A settled Swish purchase of `item` by `member`, as the payment app records
 * one: the payment carries the item and its code.
 */
export const makePurchase = (member, item, { at = new Date(), amount = item.price } = {}) =>
  Payments.insertAsync({
    hash: randomHex(), type: 'swish', amount, date: at,
    name: member.name, ...(member.mobile ? { mobile: member.mobile } : {}), member: member._id,
    externalId: randomHex(32).toUpperCase(), message: `ws:${item.code} ${member.name}`.substring(0, 50),
    storeItem: item._id, itemCode: item.code,
  });

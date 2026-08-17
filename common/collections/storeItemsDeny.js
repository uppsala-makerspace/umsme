import { Roles } from 'meteor/roles';
import { StoreItems } from './storeItems';
import { Payments } from './payments';

/**
 * Client-write rules for store items, kept apart from the collection itself.
 *
 * `meteor/roles` is not installed in the payment service, which needs the
 * collection (to name the bought item in a receipt) but has no clients to
 * police. Importing this module is therefore admin's and the app's job.
 */

const notAdminish = async (userId) =>
  !userId || !(await Roles.userIsInRoleAsync(userId, ['admin', 'board']));

StoreItems.deny({
  async insert(userId) {
    return notAdminish(userId);
  },
  async update(userId) {
    return notAdminish(userId);
  },
  // An item that has been bought must not be removable — a payment pointing at a
  // missing item breaks both the member's purchase history and the bookkeeping
  // export, which reads the account off the item. Hide it with status instead.
  // The image must be removed first, or its stored file is orphaned. The doc
  // handed to deny callbacks contains only _id, so fetch the current one.
  async remove(userId, doc) {
    if (await notAdminish(userId)) return true;
    const current = (await StoreItems.findOneAsync(doc._id)) || doc;
    if (current.imageFileId) return true;
    const bought = await Payments.findOneAsync({ storeItem: doc._id });
    return !!bought;
  },
});

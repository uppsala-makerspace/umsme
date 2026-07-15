import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { Roles } from 'meteor/roles';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';
import { Certificates } from './certificates';

export const Workshops = new Mongo.Collection('workshops');
Workshops.attachSchema(schemas.workshop);
allow(Workshops);

// Client writes are admin/board-only; the member app only reads workshops
// (through server methods).
const notAdminish = async (userId) =>
  !userId || !(await Roles.userIsInRoleAsync(userId, ['admin', 'board']));

Workshops.deny({
  async insert(userId) {
    return notAdminish(userId);
  },
  async update(userId) {
    return notAdminish(userId);
  },
  // A workshop that certificates belong to must not be removable, and the
  // image must be removed first (its stored file would otherwise be orphaned —
  // deletion goes through the adminWorkshops.removeImage method).
  async remove(userId, doc) {
    if (await notAdminish(userId)) return true;
    if (doc.imageFileId) return true;
    const used = await Certificates.findOneAsync({ workshopId: doc._id });
    return !!used;
  },
});

if (Meteor.isServer) {
  Meteor.startup(async () => {
    try {
      await Workshops.rawCollection().createIndex({ groupId: 1 });
    } catch (e) {
      console.error('Workshops index creation failed', e);
    }
  });
}

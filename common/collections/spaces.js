import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import 'meteor/aldeed:collection2/static';
import { Roles } from 'meteor/roles';
import { schemas } from '/imports/common/lib/schemas';
import { allow } from './allow';
import { Workshops } from './workshops';
import { Groups } from './groups';

export const Spaces = new Mongo.Collection('spaces');
Spaces.attachSchema(schemas.space);
allow(Spaces);

// Client writes are admin/board-only; the member app only reads spaces
// (through the data.rooms method).
const notAdminish = async (userId) =>
  !userId || !(await Roles.userIsInRoleAsync(userId, ['admin', 'board']));

Spaces.deny({
  async insert(userId) {
    return notAdminish(userId);
  },
  async update(userId) {
    return notAdminish(userId);
  },
  // A space that a workshop or group is linked to must not be removable, and
  // the icon must be removed first (its stored file would otherwise be
  // orphaned — deletion goes through the adminSpaces.removeIcon method).
  async remove(userId, doc) {
    if (await notAdminish(userId)) return true;
    const current = (await Spaces.findOneAsync(doc._id)) || doc;
    if (current.iconFileId) return true;
    const selector = {
      $or: [{ primarySpaceId: doc._id }, { secondarySpaceIds: doc._id }],
    };
    const referenced =
      (await Workshops.findOneAsync(selector)) ||
      (await Groups.findOneAsync(selector));
    return !!referenced;
  },
});

if (Meteor.isServer) {
  Meteor.startup(async () => {
    // The map keys (SVG ids) are unique per floor, not globally — e.g.
    // "kitchen" exists on both floors. Drop the earlier too-strict global
    // index if present, then enforce uniqueness per (floor, spaceId).
    try {
      await Spaces.rawCollection().dropIndex('spaceId_1');
    } catch (e) {
      // index does not exist — fine
    }
    try {
      await Spaces.rawCollection().createIndex({ floor: 1, spaceId: 1 }, { unique: true });
    } catch (e) {
      console.error('Spaces index creation failed', e);
    }
  });
}

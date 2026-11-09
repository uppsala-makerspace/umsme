import { Meteor } from 'meteor/meteor';
import { Groups } from '/imports/common/collections/groups';
import { Workshops } from '/imports/common/collections/workshops';
import { Spaces } from '/imports/common/collections/spaces';
import { ActivityCategories } from '/imports/common/collections/activityCategories';
import { Certificates } from '/imports/common/collections/certificates';
import { REGISTRATIONS, CHECK_INS } from '/imports/common/lib/activityRules';
import { parseClock } from '/imports/common/lib/days';
import { setEntityImage, clearEntityImage } from '/imports/common/server/entityImage';
import { recordChange } from '/imports/common/server/auditLog';
import { text, bilingual, setOrUnset } from '../groups/text';

/**
 * What activities and events share: their common fields (an event's override
 * its activity's, see common/lib/activityRules.js), the references in them,
 * the version check and the image.
 */

const exists = async (collection, id, what) => {
  if (id && !(await collection.findOneAsync(id, { fields: { _id: 1 } }))) {
    throw new Meteor.Error('not-found', `No such ${what}`);
  }
  return id;
};

const positive = (value, what, { integer = false } = {}) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) {
    throw new Meteor.Error('bad-value', `${what} must be a ${integer ? 'whole ' : ''}number of zero or more`);
  }
  return value;
};

/**
 * The shared fields as $set and $unset. On an activity a yes/no is always
 * stored; on an event null leaves it to the activity (`inherit`).
 */
export const sharedChanges = async (fields, { inherit }) => {
  const durationMinutes = positive(fields.durationMinutes, 'The duration', { integer: true });
  if (durationMinutes === 0) throw new Meteor.Error('bad-value', 'The duration must be at least a minute');
  const flag = (value) => (inherit && (value === undefined || value === null) ? null : !!value);
  const changes = { $set: {}, $unset: {} };
  setOrUnset(changes, {
    name: bilingual(fields.name),
    description: bilingual(fields.description),
    categoryId: await exists(ActivityCategories, text(fields.categoryId), 'category'),
    workshopId: await exists(Workshops, text(fields.workshopId), 'workshop'),
    spaceId: await exists(Spaces, text(fields.spaceId), 'space'),
    slackChannel: text(fields.slackChannel),
    contactEmail: text(fields.contactEmail),
    durationMinutes,
    cost: positive(fields.cost, 'The cost'),
    membersOnly: flag(fields.membersOnly),
    published: flag(fields.published),
    hostsPublished: flag(fields.hostsPublished),
    ...(await registrationChanges(fields, { inherit, flag })),
    targetCertificateId: await exists(Certificates, text(fields.targetCertificateId), 'certificate'),
  });
  return changes;
};

/**
 * The registration fields: whether one signs up, the seats, the queue, what
 * one must tell and hold, and the check-in. On an activity no registration is
 * stored as 'none'; on an event an empty one is the activity's.
 */
const registrationChanges = async (fields, { inherit, flag }) => {
  const registration = text(fields.registration) || (inherit ? null : 'none');
  if (registration && !REGISTRATIONS.includes(registration)) {
    throw new Meteor.Error('bad-value', `Unknown registration "${registration}"`);
  }
  const minSeats = positive(fields.minSeats, 'The fewest participants', { integer: true });
  const maxSeats = positive(fields.maxSeats, 'The seats', { integer: true });
  if (maxSeats === 0) throw new Meteor.Error('bad-value', 'An event with seats has at least one');
  if (minSeats !== null && maxSeats !== null && minSeats > maxSeats) {
    throw new Meteor.Error('bad-value', 'The fewest participants can not be more than the seats');
  }
  const checkIn = text(fields.checkIn) || (inherit ? null : 'none');
  if (checkIn && !CHECK_INS.includes(checkIn)) throw new Meteor.Error('bad-value', `Unknown check-in "${checkIn}"`);
  // A custom window's own times; the default needs none.
  const custom = checkIn === 'custom';
  const clock = (value, what) => {
    const parsed = parseClock(value);
    if (custom && !parsed) throw new Meteor.Error('bad-value', `${what} needs a time, like 15:00`);
    return custom ? parsed : null;
  };
  const opensDaysBefore = custom ? positive(fields.checkInOpensDaysBefore, 'When check-in opens', { integer: true }) : null;
  const closesDaysBefore = custom ? positive(fields.checkInClosesDaysBefore, 'When check-in closes', { integer: true }) : null;
  const opensAt = clock(fields.checkInOpensAt, 'When check-in opens');
  const closesAt = clock(fields.checkInClosesAt, 'When check-in closes');
  if (custom && (opensDaysBefore === null || closesDaysBefore === null)) {
    throw new Meteor.Error('bad-value', 'A custom check-in needs how many days before it opens and closes');
  }
  if (custom && (opensDaysBefore < closesDaysBefore || (opensDaysBefore === closesDaysBefore && opensAt >= closesAt))) {
    throw new Meteor.Error('bad-value', 'Check-in must open before it closes');
  }
  return {
    registration,
    minSeats,
    maxSeats,
    queueAllowed: flag(fields.queueAllowed),
    infoRequired: flag(fields.infoRequired),
    infoPlaceholder: text(fields.infoPlaceholder),
    requiredCertificateId: await exists(Certificates, text(fields.requiredCertificateId), 'certificate'),
    checkIn,
    checkInOpensDaysBefore: opensDaysBefore,
    checkInOpensAt: opensAt,
    checkInClosesDaysBefore: closesDaysBefore,
    checkInClosesAt: closesAt,
  };
};

/** The owning group's id, checked to exist; '' for the association's. */
export const ownerGroupId = (value) => exists(Groups, text(value), 'group');

/** The document, refused with 'conflict' if it changed since `expectedUpdatedAt`. */
export const currentOf = (collection, what) => async (docId, expectedUpdatedAt) => {
  const before = await collection.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', `No such ${what}`);
  if (expectedUpdatedAt !== undefined
      && (before.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
    throw new Meteor.Error('conflict', `Someone else changed this ${what}; reload it and try again`);
  }
  return before;
};

/** Setting and removing the image of an activity or an event, each a new version. */
export const imageActions = (collection, domain, what) => ({
  async setImage(docId, { imageBase64, mimeType }, { userId }) {
    const before = await collection.findOneAsync(docId);
    if (!before) throw new Meteor.Error('not-found', `No such ${what}`);
    const fileId = await setEntityImage(collection, before, { imageBase64, mimeType, baseName: `${what}-${docId}-${Date.now()}` });
    await collection.updateAsync(docId, { $set: { updatedAt: new Date() } });
    await recordChange({ userId, domain, action: 'uploadImage', docId, before, after: await collection.findOneAsync(docId) });
    return fileId;
  },
  async removeImage(docId, { userId }) {
    const before = await collection.findOneAsync(docId);
    if (!before) throw new Meteor.Error('not-found', `No such ${what}`);
    if (!before.imageFileId) return;
    await clearEntityImage(collection, before);
    await collection.updateAsync(docId, { $set: { updatedAt: new Date() } });
    await recordChange({ userId, domain, action: 'removeImage', docId, before, after: await collection.findOneAsync(docId) });
  },
});

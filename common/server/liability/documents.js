import { Meteor } from 'meteor/meteor';
import { LiabilityDocuments } from '/imports/common/collections/liabilityDocuments';
import { recordChange } from '/imports/common/server/auditLog';

/**
 * The liability agreement versions. The one with the latest date is the
 * version members are asked to approve (see the app's memberInfo and doors
 * methods), so adding a version asks every member to approve again.
 */

const DOMAIN = 'liability';

const fieldsOf = ({ title, date, text }) => ({
  title: title.trim(),
  date,
  text: { sv: text?.sv || '', en: text?.en || '' },
});

/** @returns {Promise<string>} the new document's id */
export const createLiabilityDocument = async (fields, { userId }) => {
  const doc = { ...fieldsOf(fields), updatedAt: new Date() };
  const docId = await LiabilityDocuments.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: doc });
  return docId;
};

/**
 * Update a version. `expectedUpdatedAt` is the updatedAt the editor loaded;
 * if the document has changed since, the update is refused with 'conflict'
 * rather than overwriting the other change.
 */
export const updateLiabilityDocument = async (docId, fields, { userId, expectedUpdatedAt }) => {
  const before = await LiabilityDocuments.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such liability document');
  if (expectedUpdatedAt !== undefined
      && (before.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
    throw new Meteor.Error('conflict', 'Someone else changed this document; reload it and try again');
  }
  const $set = { ...fieldsOf(fields), updatedAt: new Date() };
  await LiabilityDocuments.updateAsync(docId, { $set });
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId, before, after: { ...before, ...$set } });
};

export const removeLiabilityDocument = async (docId, { userId }) => {
  const before = await LiabilityDocuments.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such liability document');
  await LiabilityDocuments.removeAsync(docId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId, before });
};

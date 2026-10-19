import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Workshops } from '/imports/common/collections/workshops';
import { workshopImageStore } from '/imports/common/server/workshopImageStore';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { recordChange } from '/imports/common/server/auditLog';
import { createWorkshop, updateWorkshop, removeWorkshop, workshopDetails } from '/imports/common/server/workshops/workshops';

const roles = DOMAIN_ROLES.workshops;
const Bilingual = Match.Maybe({ sv: Match.Maybe(String), en: Match.Maybe(String) });
const Id = Match.Maybe(String);
const WorkshopFields = {
  name: { sv: String, en: Match.Maybe(String) },
  tag: Match.Optional(Bilingual),
  description: Match.Optional(Bilingual),
  rules: Match.Optional(Bilingual),
  kind: Match.Optional(String),
  status: Match.Optional(String),
  slackChannel: Match.Optional(Match.Maybe(String)),
  guidesUrl: Match.Optional(Match.Maybe(String)),
  groupId: Match.Optional(Id),
  primarySpaceId: Match.Optional(Id),
  secondarySpaceIds: Match.Optional([String]),
};

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

Meteor.methods({
  async 'workshops.create'(fields) {
    check(fields, WorkshopFields);
    await requireRole(this.userId, roles);
    return createWorkshop(fields, { userId: this.userId });
  },

  async 'workshops.update'(docId, fields, expectedUpdatedAt) {
    check(docId, String);
    check(fields, WorkshopFields);
    check(expectedUpdatedAt, Match.Maybe(Date));
    await requireRole(this.userId, roles);
    await updateWorkshop(docId, fields, { userId: this.userId, expectedUpdatedAt: expectedUpdatedAt ?? null });
  },

  async 'workshops.details'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    return workshopDetails(docId);
  },

  async 'workshops.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    await removeWorkshop(docId, { userId: this.userId });
  },

  /** Set or replace a workshop's representative image. */
  async 'adminWorkshops.uploadImage'(workshopId, imageBase64, mimeType) {
    check(workshopId, String);
    check(imageBase64, String);
    check(mimeType, String);
    await requireRole(this.userId, roles);
    const workshop = await Workshops.findOneAsync(workshopId);
    if (!workshop) throw new Meteor.Error('not-found', 'Workshop not found');
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) throw new Meteor.Error('bad-type', 'Unsupported image type');
    const buffer = Buffer.from(imageBase64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      throw new Meteor.Error('bad-size', 'Image is empty or larger than 10 MB');
    }
    const fileId = await workshopImageStore.uploadImage({
      buffer, baseName: `workshop-${workshopId}-${Date.now()}`, mimeType, date: new Date(),
    });
    await Workshops.updateAsync(workshopId, { $set: { imageFileId: fileId, imageMimeType: mimeType, updatedAt: new Date() } });
    if (workshop.imageFileId) await workshopImageStore.deleteImage(workshop.imageFileId);
    await recordChange({ userId: this.userId, domain: 'workshops', action: 'uploadImage', docId: workshopId, before: workshop, after: await Workshops.findOneAsync(workshopId) });
    return fileId;
  },

  /** Remove a workshop's image; needed before the workshop can be deleted. */
  async 'adminWorkshops.removeImage'(workshopId) {
    check(workshopId, String);
    await requireRole(this.userId, roles);
    const workshop = await Workshops.findOneAsync(workshopId);
    if (!workshop) throw new Meteor.Error('not-found', 'Workshop not found');
    if (workshop.imageFileId) {
      await workshopImageStore.deleteImage(workshop.imageFileId);
      await Workshops.updateAsync(workshopId, { $set: { updatedAt: new Date() }, $unset: { imageFileId: '', imageMimeType: '' } });
      await recordChange({ userId: this.userId, domain: 'workshops', action: 'removeImage', docId: workshopId, before: workshop, after: await Workshops.findOneAsync(workshopId) });
    }
    return true;
  },
});

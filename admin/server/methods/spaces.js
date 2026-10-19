import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Spaces } from '/imports/common/collections/spaces';
import { mapIconStore } from '/imports/common/server/mapIconStore';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { recordChange } from '/imports/common/server/auditLog';
import { createSpace, updateSpace, removeSpace, spaceLinks } from '/imports/common/server/spaces/spaces';

const roles = DOMAIN_ROLES.spaces;
const Bilingual = Match.Maybe({ sv: Match.Maybe(String), en: Match.Maybe(String) });
const SpaceFields = {
  spaceId: String,
  floor: String,
  name: { sv: String, en: Match.Maybe(String) },
  description: Match.Optional(Bilingual),
  slackChannels: Match.Optional([String]),
  iconSize: Match.Optional(Match.Maybe(Number)),
};

const ALLOWED_ICON_TYPES = ['image/svg+xml', 'image/png'];
const MAX_ICON_BYTES = 5 * 1024 * 1024;

// Upload an icon buffer to the store and stamp the space, deleting any
// previous icon file.
const setIcon = async (space, buffer, mimeType) => {
  const fileId = await mapIconStore.uploadImage({
    buffer,
    baseName: `space-${space._id}-${Date.now()}`,
    mimeType,
    date: new Date(),
  });
  await Spaces.updateAsync(space._id, {
    $set: { iconFileId: fileId, iconMimeType: mimeType, updatedAt: new Date() },
  });
  if (space.iconFileId) await mapIconStore.deleteImage(space.iconFileId);
  return fileId;
};

Meteor.methods({
  async 'spaces.create'(fields) {
    check(fields, SpaceFields);
    await requireRole(this.userId, roles);
    return createSpace(fields, { userId: this.userId });
  },

  async 'spaces.update'(docId, fields, expectedUpdatedAt) {
    check(docId, String);
    check(fields, SpaceFields);
    check(expectedUpdatedAt, Match.Maybe(Date));
    await requireRole(this.userId, roles);
    await updateSpace(docId, fields, { userId: this.userId, expectedUpdatedAt: expectedUpdatedAt ?? null });
  },

  async 'spaces.links'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    return spaceLinks(docId);
  },

  async 'spaces.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    await removeSpace(docId, { userId: this.userId });
  },

  /**
   * One-time seed of the Spaces collection from the bundled rooms.json and
   * mapicons/ (copies of the app's legacy map config). Idempotent: spaces
   * whose spaceId already exists are skipped, but spaces still missing an
   * icon get one uploaded from the bundled files.
   * @returns {{imported: number, skipped: number, icons: number}}
   */
  async 'adminSpaces.importFromRooms'() {
    await requireRole(this.userId, roles);
    let rooms;
    try {
      rooms = JSON.parse(await Assets.getTextAsync('rooms.json'));
    } catch (err) {
      throw new Meteor.Error('import-failed', `Could not read rooms.json: ${err.message}`);
    }

    let imported = 0;
    let skipped = 0;
    let icons = 0;
    for (const [floor, spaces] of Object.entries(rooms)) {
      for (const [spaceId, space] of Object.entries(spaces)) {
        // Map keys are unique per floor, so look up by both.
        let doc = await Spaces.findOneAsync({ spaceId, floor });
        if (doc) {
          skipped += 1;
        } else {
          const insert = {
            spaceId,
            floor,
            name: { sv: space.name?.sv || spaceId },
            createdAt: new Date(),
          };
          if (space.name?.en) insert.name.en = space.name.en;
          const description = {};
          if (space.description?.sv) description.sv = space.description.sv;
          if (space.description?.en) description.en = space.description.en;
          if (Object.keys(description).length) insert.description = description;
          if (space.slackChannels?.length) insert.slackChannels = space.slackChannels;
          if (space.iconSize) insert.iconSize = space.iconSize;
          const id = await Spaces.insertAsync(insert);
          doc = await Spaces.findOneAsync(id);
          imported += 1;
        }
        // Complete spaces that still lack an icon from the bundled SVGs.
        if (!doc.iconFileId && space.icon) {
          try {
            const svg = await Assets.getTextAsync(`mapicons/${space.icon}`);
            await setIcon(doc, Buffer.from(svg, 'utf8'), 'image/svg+xml');
            icons += 1;
          } catch (err) {
            console.warn(`[spaces import] icon ${space.icon} for ${spaceId} skipped:`, err.message);
          }
        }
      }
    }
    return { imported, skipped, icons };
  },

  /**
   * Set or replace a space's map icon (admin/board).
   * @param {string} spaceId  The space document _id
   * @param {string} iconBase64  Raw base64 (no data: prefix)
   * @param {string} mimeType  image/svg+xml or image/png
   */
  async 'adminSpaces.uploadIcon'(spaceId, iconBase64, mimeType) {
    check(spaceId, String);
    check(iconBase64, String);
    check(mimeType, String);
    await requireRole(this.userId, roles);
    const space = await Spaces.findOneAsync(spaceId);
    if (!space) throw new Meteor.Error('not-found', 'Space not found');
    if (!ALLOWED_ICON_TYPES.includes(mimeType)) {
      throw new Meteor.Error('bad-type', 'Unsupported icon type (use SVG or PNG)');
    }
    const buffer = Buffer.from(iconBase64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_ICON_BYTES) {
      throw new Meteor.Error('bad-size', 'Icon is empty or larger than 5 MB');
    }
    const fileId = await setIcon(space, buffer, mimeType);
    await recordChange({ userId: this.userId, domain: 'spaces', action: 'uploadIcon', docId: spaceId, before: space, after: await Spaces.findOneAsync(spaceId) });
    return fileId;
  },

  /**
   * Remove a space's icon (admin/board). Required before the space itself
   * can be deleted (see the deny rule on Spaces).
   */
  async 'adminSpaces.removeIcon'(spaceId) {
    check(spaceId, String);
    await requireRole(this.userId, roles);
    const space = await Spaces.findOneAsync(spaceId);
    if (!space) throw new Meteor.Error('not-found', 'Space not found');
    if (space.iconFileId) {
      await mapIconStore.deleteImage(space.iconFileId);
      await Spaces.updateAsync(spaceId, {
        $set: { updatedAt: new Date() },
        $unset: { iconFileId: '', iconMimeType: '' },
      });
      await recordChange({ userId: this.userId, domain: 'spaces', action: 'removeIcon', docId: spaceId, before: space, after: await Spaces.findOneAsync(spaceId) });
    }
    return true;
  },
});

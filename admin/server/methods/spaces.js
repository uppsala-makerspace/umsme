import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Spaces } from '/imports/common/collections/spaces';
import { mapIconStore } from '/imports/common/server/mapIconStore';

const requireRole = async (roles) => {
  if (!Meteor.userId() || !(await Roles.userIsInRoleAsync(Meteor.userId(), roles))) {
    throw new Meteor.Error('not-authorized', 'Insufficient role');
  }
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
    $set: { iconFileId: fileId, iconMimeType: mimeType },
  });
  if (space.iconFileId) await mapIconStore.deleteImage(space.iconFileId);
  return fileId;
};

Meteor.methods({
  /**
   * One-time seed of the Spaces collection from the bundled rooms.json and
   * mapicons/ (copies of the app's legacy map config). Idempotent: spaces
   * whose spaceId already exists are skipped, but spaces still missing an
   * icon get one uploaded from the bundled files.
   * @returns {{imported: number, skipped: number, icons: number}}
   */
  'adminSpaces.importFromRooms': async () => {
    await requireRole(['admin', 'board']);
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
  'adminSpaces.uploadIcon': async (spaceId, iconBase64, mimeType) => {
    await requireRole(['admin', 'board']);
    const space = await Spaces.findOneAsync(spaceId);
    if (!space) throw new Meteor.Error('not-found', 'Space not found');
    if (!ALLOWED_ICON_TYPES.includes(mimeType)) {
      throw new Meteor.Error('bad-type', 'Unsupported icon type (use SVG or PNG)');
    }
    const buffer = Buffer.from(iconBase64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_ICON_BYTES) {
      throw new Meteor.Error('bad-size', 'Icon is empty or larger than 5 MB');
    }
    return setIcon(space, buffer, mimeType);
  },

  /**
   * Remove a space's icon (admin/board). Required before the space itself
   * can be deleted (see the deny rule on Spaces).
   */
  'adminSpaces.removeIcon': async (spaceId) => {
    await requireRole(['admin', 'board']);
    const space = await Spaces.findOneAsync(spaceId);
    if (!space) throw new Meteor.Error('not-found', 'Space not found');
    if (space.iconFileId) {
      await mapIconStore.deleteImage(space.iconFileId);
      await Spaces.updateAsync(spaceId, {
        $unset: { iconFileId: '', iconMimeType: '' },
      });
    }
    return true;
  },
});

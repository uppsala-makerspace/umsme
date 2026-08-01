import { Groups } from '/imports/common/collections/groups';

/**
 * One-off data migrations, run at admin startup.
 *
 * Each migration must be idempotent (safe to run on every boot) and cheap
 * enough that it costs nothing once it has no work left to do. Admin owns them
 * because it is the staff app that manages this data; the member app and the
 * payment service must not run them.
 *
 * Remove a migration once it has run in production.
 */

/**
 * 2026-08: the group type 'workshop' was renamed to 'steering' (styrgrupp),
 * because the group steers a workshop rather than being one. Schema validation
 * is bypassed on purpose: 'workshop' is no longer an allowed value, so
 * Collection2 would reject the very documents we need to fix.
 */
const renameWorkshopGroupType = async () => {
  const collection = Groups.rawCollection();
  const { matchedCount, modifiedCount } = await collection.updateMany(
    { type: 'workshop' },
    { $set: { type: 'steering' } }
  );
  if (matchedCount) {
    console.log(`[migration] group type workshop -> steering: ${modifiedCount} group(s) updated`);
  }
};

export default async () => {
  await renameWorkshopGroupType();
};

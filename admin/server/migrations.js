import { Groups } from '/imports/common/collections/groups';
import Invites from '/imports/common/collections/Invites';
import { normalizeEmail } from '/imports/common/lib/memberMatch';

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

/**
 * 2026-08: steering groups no longer take join requests. Their members are added
 * by an approver, in person and by membership number. Only groups that predate
 * the field are touched, so an admin who deliberately reopens one keeps it open.
 */
const closeSteeringGroupsToRequests = async () => {
  const collection = Groups.rawCollection();
  const { modifiedCount } = await collection.updateMany(
    { type: 'steering', allowJoinRequests: { $exists: false } },
    { $set: { allowJoinRequests: false } }
  );
  if (modifiedCount) {
    console.log(`[migration] steering groups closed to join requests: ${modifiedCount}`);
  }
};

/**
 * 2026-09: family invites used to store the email exactly as typed, while
 * member emails are lowercased, so an invite typed with capitals was never
 * found for the invited member. New invites are normalised on insert; this
 * fixes the ones already stored. An invite that would collide with an
 * existing lowercased invite to the same family is dropped as a duplicate.
 */
const lowercaseInviteEmails = async () => {
  const collection = Invites.rawCollection();
  const invites = await collection
    .find({ email: { $regex: '[A-Z]|^\\s|\\s$' } })
    .toArray();
  let updated = 0;
  let removed = 0;
  for (const invite of invites) {
    const email = normalizeEmail(invite.email);
    const duplicate = await collection.findOne({
      _id: { $ne: invite._id },
      email,
      infamily: invite.infamily,
    });
    if (duplicate) {
      await collection.deleteOne({ _id: invite._id });
      removed += 1;
    } else {
      await collection.updateOne({ _id: invite._id }, { $set: { email } });
      updated += 1;
    }
  }
  if (updated || removed) {
    console.log(`[migration] invite emails lowercased: ${updated} updated, ${removed} duplicate(s) removed`);
  }
};

export default async () => {
  await renameWorkshopGroupType();
  await closeSteeringGroupsToRequests();
  await lowercaseInviteEmails();
};

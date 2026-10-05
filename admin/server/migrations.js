import { Groups } from '/imports/common/collections/groups';
import { Workshops } from '/imports/common/collections/workshops';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Members } from '/imports/common/collections/members';

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

// Fields an interest group shares with a workshop document, copied as they are.
// The image can move along because groups and workshops use the same image
// store; only the route that serves it changes.
const SHARED_FIELDS = [
  'name',
  'tag',
  'description',
  'rules',
  'slackChannel',
  'guidesUrl',
  'imageFileId',
  'imageMimeType',
  'primarySpaceId',
  'secondarySpaceIds',
  'createdAt',
];

/**
 * The area of interest that replaces an interest group: same _id, so links and
 * the image keep pointing at the same thing, and its steering group (from the
 * since-reverted steeringGroupId) as the responsible group.
 *
 * An interest group was running, so it becomes an established area of interest;
 * admin can change the status afterwards.
 */
export const areaOfInterestFromGroup = (group) => {
  const doc = { _id: group._id, kind: 'areaOfInterest', status: 'established' };
  for (const field of SHARED_FIELDS) {
    if (group[field] !== undefined && group[field] !== null) doc[field] = group[field];
  }
  if (group.steeringGroupId) doc.groupId = group.steeringGroupId;
  return doc;
};

/**
 * 2026-10: interest groups became areas of interest (intresseområden), a kind of
 * workshop. Each interest group is turned into an area of interest, references to
 * it are moved over, its memberships are dropped (an area of interest has no
 * members — those who should stay were moved into its steering group by hand
 * first; the dropped ones are logged) and the group is removed.
 *
 * Raw collections throughout: 'interest' is no longer an allowed group type, so
 * Collection2 would reject the very documents this migrates.
 */
const interestGroupsToAreasOfInterest = async () => {
  const groups = Groups.rawCollection();
  const workshops = Workshops.rawCollection();
  const log = (message) => console.log(`[migration] interest group -> area of interest: ${message}`);

  for (const group of await groups.find({ type: 'interest' }).toArray()) {
    const name = group.name?.sv || group._id;

    if (!(await workshops.findOne({ _id: group._id }))) {
      await workshops.insertOne(areaOfInterestFromGroup(group));
      log(`created area of interest "${name}"${group.steeringGroupId ? '' : ' without a steering group'}`);
    }

    if (group.relatedWorkshopIds?.length) {
      log(`"${name}" was related to workshops ${group.relatedWorkshopIds.join(', ')}; not carried over`);
    }

    // Groups that listed it as a related group now list it as a related
    // workshop, which is how a group points at an area of interest.
    const { modifiedCount: relinked } = await groups.updateMany(
      { relatedGroupIds: group._id },
      { $pull: { relatedGroupIds: group._id }, $addToSet: { relatedWorkshopIds: group._id } }
    );
    if (relinked) log(`${relinked} group(s) now relate to "${name}" as an area of interest`);

    // Expense accounts move to the steering group, whose members spend on
    // them; without one they are left without this group and logged.
    for (const account of await ExpenseAccounts.rawCollection().find({ groupIds: group._id }).toArray()) {
      const groupIds = [
        ...new Set(
          account.groupIds
            .map((id) => (id === group._id ? group.steeringGroupId : id))
            .filter(Boolean)
        ),
      ];
      await ExpenseAccounts.rawCollection().updateOne({ _id: account._id }, { $set: { groupIds } });
      log(
        group.steeringGroupId
          ? `expense account "${account.name}" moved to the steering group`
          : `expense account "${account.name}" lost "${name}" and has no steering group to move to`
      );
    }

    const memberships = await GroupMemberships.rawCollection().find({ groupId: group._id }).toArray();
    if (memberships.length) {
      const members = await Members.rawCollection()
        .find({ _id: { $in: memberships.map((m) => m.memberId) } }, { projection: { name: 1, mid: 1 } })
        .toArray();
      const names = members.map((m) => `${m.name} (${m.mid})`).join(', ');
      await GroupMemberships.rawCollection().deleteMany({ groupId: group._id });
      log(`dropped ${memberships.length} membership(s) in "${name}": ${names}`);
    }

    await groups.deleteOne({ _id: group._id });
    log(`removed group "${name}"`);
  }

  // The steering link the reverted commit added; areas of interest now carry it
  // as groupId.
  const { modifiedCount: unlinked } = await groups.updateMany(
    { steeringGroupId: { $exists: true } },
    { $unset: { steeringGroupId: '' } }
  );
  if (unlinked) log(`cleared steeringGroupId on ${unlinked} group(s)`);

  // Name the kind on the workshops that predate it, so lists and the admin
  // table show it rather than a blank.
  const { modifiedCount: kinded } = await workshops.updateMany(
    { kind: { $exists: false } },
    { $set: { kind: 'workshop' } }
  );
  if (kinded) log(`marked ${kinded} existing workshop(s) as kind "workshop"`);
};

export default async () => {
  await interestGroupsToAreasOfInterest();
};

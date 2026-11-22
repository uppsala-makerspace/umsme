import { Groups } from '/imports/common/collections/groups';
import { Workshops } from '/imports/common/collections/workshops';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Members } from '/imports/common/collections/members';
import { Categories } from '/imports/common/collections/categories';
import { withUniqueSlugs } from '/imports/common/lib/slug';
import { formatRfid, RFID_PATTERN } from '/imports/common/lib/rfid';

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

/**
 * The activities' categories became the shared categories: the collection
 * `activityCategories` is renamed `categories`, each category without a slug
 * gets the one the website already knew it by (from its Swedish name), and the
 * groups' and workshops' free `tag`, which categories replace, is dropped.
 *
 * Raw collections: a category without a slug fails the new schema.
 */
export const activityCategoriesToCategories = async () => {
  const log = (message) => console.log(`[migration] categories: ${message}`);
  const db = Categories.rawDatabase();
  const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
  const categories = Categories.rawCollection();
  if (names.includes('activityCategories')) {
    if (!names.includes('categories') || (await categories.countDocuments()) === 0) {
      if (names.includes('categories')) await db.dropCollection('categories');
      await db.renameCollection('activityCategories', 'categories');
      log('renamed activityCategories to categories');
    } else {
      log('both activityCategories and categories have documents; left activityCategories as it is');
    }
  }

  const all = await categories.find({}, { projection: { name: 1, slug: 1 } }).toArray();
  if (all.some((c) => !c.slug)) {
    const taken = new Set(all.filter((c) => c.slug).map((c) => c.slug));
    const slugs = withUniqueSlugs(all.filter((c) => !c.slug).map((c) => ({ _id: c._id, source: c.name?.sv })));
    for (const { _id, slug } of slugs) {
      let unique = slug;
      for (let n = 2; taken.has(unique); n += 1) unique = `${slug}-${n}`;
      taken.add(unique);
      await categories.updateOne({ _id }, { $set: { slug: unique } });
      log(`gave ${_id} the slug "${unique}"`);
    }
  }

  for (const collection of [Groups.rawCollection(), Workshops.rawCollection()]) {
    const { modifiedCount } = await collection.updateMany({ tag: { $exists: true } }, { $unset: { tag: '' } });
    if (modifiedCount) log(`dropped the tag of ${modifiedCount} in ${collection.collectionName}`);
  }
};

/**
 * Members' RFID tags as they are now stored, 03-D7-3B-99, from the hex without
 * dashes they were kept as. An empty tag is removed; one that cannot be made
 * whole (an odd number of digits) is left and named in the log.
 */
export const rfidWithDashes = async () => {
  const raw = Members.rawCollection();
  const members = await raw.find(
    { rfid: { $exists: true, $not: RFID_PATTERN } },
    { projection: { rfid: 1 } },
  ).toArray();
  let fixed = 0;
  for (const { _id, rfid } of members) {
    const tag = formatRfid(rfid);
    if (!tag) await raw.updateOne({ _id }, { $unset: { rfid: '' } });
    else if (RFID_PATTERN.test(tag)) await raw.updateOne({ _id }, { $set: { rfid: tag } });
    else { console.log(`[migration] rfid: RFID tag of member ${_id} left as it is: ${rfid}`); continue; }
    fixed += 1;
  }
  if (fixed) console.log(`[migration] rfid: wrote ${fixed} RFID tags with dashes`);
};

export default async () => {
  await interestGroupsToAreasOfInterest();
  await activityCategoriesToCategories();
  await rfidWithDashes();
};

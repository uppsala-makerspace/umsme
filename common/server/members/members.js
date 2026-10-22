import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Messages } from '/imports/common/collections/messages';
import { Payments } from '/imports/common/collections/payments';
import Invites from '/imports/common/collections/Invites';
import { memberStatus, updateMember } from '/imports/common/lib/utils';
import { userSelectorForMember } from '/imports/common/lib/memberMatch';
import { recordChange } from '/imports/common/server/auditLog';

/**
 * Members as admin keeps them: adding one, their details, registration and
 * exclusion, removal, their dates against their memberships, and families.
 * A dependent's dates follow the payer's (common/server/familyCascade.js).
 */

const DOMAIN = 'members';

/** What admin edits on a member's page; the rest comes from payments, the app or the board's actions. */
export const MEMBER_DETAIL_FIELDS = [
  'name', 'birthyear', 'gender', 'rfid', 'bankName', 'bankClearing', 'bankAccountNumber', 'bankAccountHolder',
  'email', 'lock', 'youth', 'liability', 'liabilityDate', 'mobile',
];
const BOOLEANS = ['youth', 'liability'];

const memberOf = async (memberId) => {
  const member = await Members.findOneAsync(memberId);
  if (!member) throw new Meteor.Error('not-found', 'No such member');
  return member;
};

const detailsOf = (fields) => {
  const $set = {};
  const $unset = {};
  for (const field of MEMBER_DETAIL_FIELDS) {
    if (!(field in fields)) continue;
    const value = typeof fields[field] === 'string' ? fields[field].trim() : fields[field];
    if (BOOLEANS.includes(field)) $set[field] = !!value;
    else if (value === null || value === undefined || value === '') $unset[field] = '';
    else $set[field] = field === 'email' ? value.toLowerCase() : value;
  }
  if ('name' in $unset) throw new Meteor.Error('bad-name', 'A member needs a name');
  return { $set, $unset };
};

/** A member number nobody has: five digits at most, as the Blaze form drew them. */
const freeMid = async () => {
  for (;;) {
    const mid = String(Math.floor(Math.random() * 100000));
    if (!(await Members.findOneAsync({ mid }))) return mid;
  }
};

/**
 * Add a member, in a payer's family if `infamily` is given, the owner of an
 * unfiled payment if `paymentId` is.
 *
 * @returns {Promise<string>} the new member's id
 */
export const createMember = async (fields, { infamily, paymentId, userId }) => {
  const { $set } = detailsOf(fields);
  if (!$set.name) throw new Meteor.Error('bad-name', 'A member needs a name');
  if (infamily) await memberOf(infamily);
  const doc = { ...$set, mid: await freeMid(), youth: !!$set.youth, liability: !!$set.liability, ...(infamily ? { infamily } : {}), updatedAt: new Date() };
  const docId = await Members.insertAsync(doc);
  await updateMember(await Members.findOneAsync(docId));
  if (infamily) {
    // Hook B copies the payer's dates on an update of infamily, not on an insert.
    const payer = await Members.findOneAsync(infamily);
    await Members.updateAsync(docId, { $set: { family: !!payer.family, ...(payer.member ? { member: payer.member } : {}), ...(payer.lab ? { lab: payer.lab } : {}) } });
  }
  if (paymentId) await Payments.updateAsync({ _id: paymentId, member: { $exists: false } }, { $set: { member: docId } });
  await recordChange({ userId, domain: DOMAIN, action: 'create', docId, after: await Members.findOneAsync(docId) });
  return docId;
};

/** Change a member's details, refused with 'conflict' if admin changed them since `expectedUpdatedAt`. */
export const updateMemberDetails = async (memberId, fields, { userId, expectedUpdatedAt }) => {
  const before = await memberOf(memberId);
  if (expectedUpdatedAt !== undefined && (before.updatedAt?.getTime() ?? null) !== (expectedUpdatedAt?.getTime() ?? null)) {
    throw new Meteor.Error('conflict', 'Someone else changed this member; reload and try again');
  }
  const { $set, $unset } = detailsOf(fields);
  if ($set.email && (await Members.findOneAsync({ email: $set.email, _id: { $ne: memberId } }))) {
    throw new Meteor.Error('email-taken', 'Another member has this email');
  }
  $set.updatedAt = new Date();
  await Members.updateAsync(memberId, Object.keys($unset).length ? { $set, $unset } : { $set });
  await recordChange({ userId, domain: DOMAIN, action: 'update', docId: memberId, before, after: await Members.findOneAsync(memberId) });
};

const flag = (field, action) => async (memberId, on, { userId }) => {
  const before = await memberOf(memberId);
  await Members.updateAsync(memberId, on ? { $set: { [field]: true, updatedAt: new Date() } } : { $unset: { [field]: '' }, $set: { updatedAt: new Date() } });
  await recordChange({ userId, domain: DOMAIN, action: on ? action : `un${action}`, docId: memberId, before, after: await Members.findOneAsync(memberId) });
};

/** Accept a member (registered), or take it back. */
export const setRegistered = flag('registered', 'register');
/** Exclude a member: no door, no payments, skipped by reminders, mails and notifications. Or reinstate them. */
export const setExcluded = flag('excluded', 'exclude');

/** Put the member's dates right from their memberships. */
export const refreshMemberDates = async (memberId, { userId }) => {
  const before = await memberOf(memberId);
  await updateMember(before);
  await recordChange({ userId, domain: DOMAIN, action: 'refreshDates', docId: memberId, before, after: await Members.findOneAsync(memberId) });
};

/**
 * Remove a member with their memberships and messages; refused while they
 * pay for a family. Their payments stay, as before.
 */
export const removeMember = async (memberId, { userId }) => {
  const before = await memberOf(memberId);
  if (await Members.findOneAsync({ infamily: memberId })) {
    throw new Meteor.Error('has-family', 'Before you can remove this member you have to disconnect the family members.');
  }
  await Memberships.removeAsync({ mid: memberId });
  await Messages.removeAsync({ member: memberId });
  await Members.removeAsync(memberId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId: memberId, before });
};

/** A member who may join a family: not the payer, in no family, not paying for one. */
const familyCandidate = (payerId) => ({ _id: { $ne: payerId }, infamily: { $exists: false }, family: { $ne: true } });
export const familyCandidateSelector = familyCandidate;

/** Add a member to a payer's family; their dates follow the payer's. */
export const addFamilyMember = async (payerId, memberId, { userId }) => {
  const payer = await memberOf(payerId);
  if (!payer.family || payer.infamily) throw new Meteor.Error('not-payer', 'The member does not pay for a family');
  if (!(await Members.findOneAsync({ _id: memberId, ...familyCandidate(payerId) }))) {
    throw new Meteor.Error('not-candidate', 'The member is in a family already, or pays for one');
  }
  await Members.updateAsync(memberId, { $set: { infamily: payerId, updatedAt: new Date() } });
  await recordChange({ userId, domain: DOMAIN, action: 'joinFamily', docId: memberId, after: { infamily: payerId } });
};

/** Take a member out of their family: they stay, paying for themselves, their dates from their own memberships. */
export const removeFromFamily = async (memberId, { userId }) => {
  const before = await memberOf(memberId);
  if (!before.infamily) throw new Meteor.Error('not-in-family', 'The member is in no family');
  await Members.updateAsync(memberId, { $unset: { infamily: '' }, $set: { updatedAt: new Date() } });
  await recordChange({ userId, domain: DOMAIN, action: 'leaveFamily', docId: memberId, before, after: await Members.findOneAsync(memberId) });
};

const same = (a, b) => (a && b ? a.getTime() === b.getTime() : !a && !b);

/** Everything a member's page shows besides the member itself. */
export const memberDetail = async (memberId) => {
  const member = await memberOf(memberId);
  const status = await memberStatus(member);
  const familyMembers = await Members.find({ infamily: memberId }, { fields: { name: 1, mid: 1, email: 1, member: 1, lab: 1 }, sort: { name: 1 } }).fetchAsync();
  const invites = await Invites.find({ infamily: memberId }).fetchAsync();
  const invitees = Object.fromEntries((await Members.find({ email: { $in: invites.map((i) => i.email) } }, { fields: { name: 1, email: 1 } }).fetchAsync()).map((m) => [m.email, m]));
  const received = member.email ? await Invites.find({ email: member.email }).fetchAsync() : [];
  const inviters = Object.fromEntries((await Members.find({ _id: { $in: received.map((i) => i.infamily) } }, { fields: { name: 1 } }).fetchAsync()).map((m) => [m._id, m.name]));
  const user = member.email ? await Meteor.users.findOneAsync(userSelectorForMember(member), { fields: { username: 1, emails: 1 } }) : null;
  return {
    status: {
      memberEnd: status.memberEnd || null, labEnd: status.labEnd || null, family: !!status.family,
      inconsistent: !same(member.member, status.memberEnd) || !same(member.lab, status.labEnd) || (member.family === true) !== !!status.family,
    },
    payer: member.infamily ? (await Members.findOneAsync(member.infamily, { fields: { name: 1 } })) || { _id: member.infamily, name: member.infamily } : null,
    user: user ? { _id: user._id, username: user.username || user.emails?.[0]?.address } : null,
    familyMembers,
    invites: invites.map((i) => ({ _id: i._id, email: i.email, invitee: invitees[i.email] || null })),
    invitesReceived: received.map((i) => ({ _id: i._id, infamily: i.infamily, inviterName: inviters[i.infamily] || i.infamily })),
    memberships: await Memberships.find({ mid: memberId }, { sort: { start: -1 } }).fetchAsync(),
  };
};

/** Rows for the CSV downloads: current members, or every member. */
export const memberExport = async (kind, now = new Date()) => {
  const day = (d) => (d ? d.toISOString().substring(0, 10) : '');
  if (kind === 'current') {
    const current = await Members.find({ member: { $gte: now } }, { fields: { name: 1, email: 1, lab: 1, family: 1, infamily: 1 } }).fetchAsync();
    return [['Name', 'Email', 'Lab', 'Family', 'Paying member'], ...current.map((m) => [m.name, m.email, `${m.lab > now}`, `${m.family}`, `${!m.infamily}`])];
  }
  const all = await Members.find({}, { fields: { mid: 1, name: 1, email: 1, member: 1, lab: 1, family: 1, infamily: 1 } }).fetchAsync();
  return [['Id', 'Name', 'Email', 'Member to', 'Labbmember to', 'Family', 'Paying member'],
    ...all.map((m) => [m.mid, m.name, m.email, day(m.member), day(m.lab), `${m.family}`, `${!m.infamily}`])];
};

/** What a new member made from an unfiled payment starts with: name, and an email in the message; not the mobile, which members set themselves (GDPR). */
export const memberDraftFromPayment = async (paymentId) => {
  const payment = await Payments.findOneAsync(paymentId, { fields: { hash: 0 } });
  if (!payment) throw new Meteor.Error('not-found', 'No such payment');
  const email = payment.message?.match(/([\w.]*@[\w.]*)/)?.[1];
  return { payment, draft: { ...(payment.name ? { name: payment.name } : {}), ...(email ? { email } : {}) } };
};

/** Members waiting for the board: they have paid, are not accepted, excluded nor in a family. With what they have paid. */
export const pendingMembers = async () => {
  const members = await Members.find(
    { registered: { $ne: true }, excluded: { $ne: true }, infamily: { $exists: false }, member: { $exists: true } },
    { fields: { name: 1, email: 1, mid: 1, member: 1, lab: 1, family: 1, infamily: 1, reminder: 1 }, sort: { name: 1 } },
  ).fetchAsync();
  const memberships = await Memberships.find({ mid: { $in: members.map((m) => m._id) } }, { fields: { mid: 1, amount: 1 } }).fetchAsync();
  const users = await Meteor.users.find({ 'emails.address': { $in: members.map((m) => m.email).filter(Boolean) } }, { fields: { emails: 1 } }).fetchAsync();
  return members.map((m) => ({
    ...m,
    totalPaid: memberships.filter((ms) => ms.mid === m._id).reduce((sum, ms) => sum + (ms.amount || 0), 0),
    userId: users.find((u) => u.emails?.some((e) => e.address === m.email))?._id || null,
  }));
};

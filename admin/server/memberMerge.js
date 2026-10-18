import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Payments } from '/imports/common/collections/payments';
import { initiatedPayments } from '/imports/common/collections/initiatedPayments';
import { Messages } from '/imports/common/collections/messages';
import { Comments } from '/imports/common/collections/comments';
import Invites from '/imports/common/collections/Invites';
import { Attestations } from '/imports/common/collections/attestations';
import { Certificates } from '/imports/common/collections/certificates';
import { TestAttempts } from '/imports/common/collections/testAttempts';
import { Expenses } from '/imports/common/collections/expenses';
import { ExpenseBudgets } from '/imports/common/collections/expenseBudgets';
import { ExpenseAccounts } from '/imports/common/collections/expenseAccounts';
import { Groups } from '/imports/common/collections/groups';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { DoorUnlocks } from '/imports/common/collections/doorunlocks';
import {
  StorageUnits, StorageRequests, StorageOffers, StorageEvents,
} from '/imports/common/collections/storage';
import { ACTIVE_STORAGE_REQUEST_STATUSES } from '/imports/common/lib/storageRules';
import { normalizedEmails, userSelectorForMember } from '/imports/common/lib/memberMatch';
import { updateMember } from '/imports/common/lib/utils';
import { reconcileStorageState } from '/imports/common/server/storage/reconciliation';
import { syncLinkedRoleById } from '/imports/common/server/linkedRoleSync';

/**
 * Merging a duplicate member (the source) into the one that is kept (the
 * destination): every document that references the source's _id is pointed at
 * the destination, then the source is removed.
 *
 * Of the fields on the source member itself, the personal details the
 * destination lacks are filled in from the source (see fieldCopies). The
 * destination's own values always win; anything else on the source is lost
 * with it, so the admin copies what should survive first.
 *
 * Every reference to a member _id in the database is listed in FIELD_MOVES or
 * ARRAY_MOVES, or handled specially below. A new field that stores a member
 * _id has to be added here, or merging leaves it pointing at a removed member.
 *
 * There is no transaction. The source is removed last, so a merge that stops
 * half-way can be run again and moves whatever is left.
 */

const MAX_FAMILY_DEPENDENTS = 4;

// Plain single-valued references: { collection, field, label }.
const FIELD_MOVES = [
  { collection: Memberships, field: 'mid', label: 'Memberships' },
  { collection: Payments, field: 'member', label: 'Payments' },
  { collection: initiatedPayments, field: 'member', label: 'Initiated payments' },
  { collection: Messages, field: 'member', label: 'Messages' },
  { collection: Comments, field: 'about', label: 'Comments' },
  { collection: Members, field: 'infamily', label: 'Family members' },
  { collection: Invites, field: 'infamily', label: 'Family invites' },
  { collection: Attestations, field: 'certifierId', label: 'Attestations given as certifier' },
  { collection: TestAttempts, field: 'memberId', label: 'Test attempts' },
  { collection: Expenses, field: 'memberId', label: 'Expenses' },
  { collection: Expenses, field: 'confirmedBy', label: 'Expenses confirmed' },
  { collection: Expenses, field: 'rejectedBy', label: 'Expenses rejected' },
  { collection: Expenses, field: 'reimbursedBy', label: 'Expenses reimbursed' },
  { collection: ExpenseBudgets, field: 'setBy', label: 'Budgets set' },
  { collection: Groups, field: 'responsibleMemberId', label: 'Groups responsible for' },
  { collection: GroupMemberships, field: 'approvedBy', label: 'Group memberships approved' },
  { collection: DoorUnlocks, field: 'memberid', label: 'Door unlocks' },
  { collection: StorageUnits, field: 'owner', label: 'Storage units' },
  { collection: StorageRequests, field: 'owner', label: 'Storage requests' },
  { collection: StorageOffers, field: 'owner', label: 'Storage offers' },
  { collection: StorageEvents, field: 'member', label: 'Storage events' },
];

// Arrays of member ids, where the destination may already be listed.
const ARRAY_MOVES = [
  { collection: Certificates, field: 'certifiers', label: 'Certificates as certifier' },
  { collection: ExpenseAccounts, field: 'approverMemberIds', label: 'Expense accounts as approver' },
];

const fmt = (date) => (date ? date.toISOString().slice(0, 10) : '–');

const isEmpty = (value) => value === undefined || value === null || value === '';

// Personal details filled in on the destination where it has none.
const COPIED_FIELDS = [
  { field: 'birthyear', label: 'Year of birth' },
  { field: 'gender', label: 'Gender' },
  { field: 'mobile', label: 'Mobile' },
  { field: 'rfid', label: 'RFID' },
];
// Copied together or not at all, so an account number never ends up with
// another bank's clearing number.
const BANK_FIELDS = [
  { field: 'bankName', label: 'Bank' },
  { field: 'bankClearing', label: 'Clearing number' },
  { field: 'bankAccountNumber', label: 'Account number' },
  { field: 'bankAccountHolder', label: 'Account holder' },
];

/**
 * What the destination takes over from the source member document.
 *
 * @return {Array<{field: string, label: string, value: *, shown: string}>}
 */
const fieldCopies = (source, dest) => {
  const copies = COPIED_FIELDS
    .filter(({ field }) => isEmpty(dest[field]) && !isEmpty(source[field]))
    .map(({ field, label }) => ({ field, label, value: source[field], shown: String(source[field]) }));

  // A later approval of the liability document is the one that still holds.
  if (source.liabilityDate && (!dest.liabilityDate || source.liabilityDate > dest.liabilityDate)) {
    copies.push({
      field: 'liabilityDate', label: 'Liability date', value: source.liabilityDate, shown: fmt(source.liabilityDate),
    });
  }
  // Accepted by the board as the source means the person is accepted.
  if (source.registered && !dest.registered) {
    copies.push({ field: 'registered', label: 'Accepted by the board', value: true, shown: 'yes' });
  }
  if (BANK_FIELDS.every(({ field }) => isEmpty(dest[field])) && !isEmpty(source.bankAccountNumber)) {
    for (const { field, label } of BANK_FIELDS) {
      if (!isEmpty(source[field])) copies.push({ field, label, value: source[field], shown: String(source[field]) });
    }
  }
  return copies;
};

const membershipEnd = (ms) => {
  const ends = [ms.memberend, ms.labend].filter(Boolean);
  return ends.length ? new Date(Math.max(...ends.map((d) => d.getTime()))) : ms.start;
};

const overlaps = (a, b) => a.start < membershipEnd(b) && b.start < membershipEnd(a);

// Attestations of the source for a certificate the destination already holds;
// those are dropped instead of moved, so the destination keeps one per certificate.
const duplicateAttestations = async (sourceId, destId) => {
  const held = (await Attestations.find({ memberId: destId }, { fields: { certificateId: 1 } }).fetchAsync())
    .map((a) => a.certificateId);
  return Attestations.find({ memberId: sourceId, certificateId: { $in: held } }).fetchAsync();
};

// Group rows of the source in a group the destination is also in. The unique
// {groupId, memberId} index allows only one, so the active one is kept.
const groupCollisions = async (sourceId, destId) => {
  const destRows = await GroupMemberships.find({ memberId: destId }).fetchAsync();
  const destByGroup = new Map(destRows.map((r) => [r.groupId, r]));
  const sourceRows = await GroupMemberships.find({
    memberId: sourceId, groupId: { $in: [...destByGroup.keys()] },
  }).fetchAsync();
  return sourceRows.map((source) => ({ source, dest: destByGroup.get(source.groupId) }));
};

const storageBlockers = async (sourceId, destId) => {
  const both = async (collection, selector) =>
    (await collection.find({ ...selector, owner: sourceId }).countAsync()) > 0
    && (await collection.find({ ...selector, owner: destId }).countAsync()) > 0;
  const blockers = [];
  if (await both(StorageUnits, { availability_status: 'occupied' })) {
    blockers.push('Both members occupy a storage unit. A member can only have one; release one of them first.');
  }
  if (await both(StorageRequests, { request_status: { $in: ACTIVE_STORAGE_REQUEST_STATUSES } })) {
    blockers.push('Both members have an active storage request. Cancel one of them first.');
  }
  if (await both(StorageOffers, {})) {
    blockers.push('Both members have a storage offer. Resolve one of them first.');
  }
  return blockers;
};

const membersSummary = async (member) => ({
  _id: member._id,
  mid: member.mid,
  name: member.name,
  email: member.email,
  infamily: member.infamily,
  memberships: (await Memberships.find({ mid: member._id }, { sort: { start: 1 } }).fetchAsync())
    .map((ms) => ({ _id: ms._id, type: ms.type, start: fmt(ms.start), end: fmt(membershipEnd(ms)) })),
});

/**
 * What a merge would do, without changing anything.
 *
 * @param {object} source member to remove
 * @param {object} dest member to keep
 * @return {Promise<{source, dest, moves: Array<{label, count}>, blockers: string[], warnings: string[]}>}
 */
export const planMemberMerge = async (source, dest) => {
  const blockers = [];
  const warnings = [];

  if (source._id === dest._id) blockers.push('Source and destination are the same member.');
  if (source.infamily === dest._id || dest.infamily === source._id) {
    blockers.push('One member is in the other one\'s family. Disconnect them first.');
  }
  if (source.infamily) {
    blockers.push('The source member belongs to a family. Disconnect it from the family first.');
  }
  blockers.push(...await storageBlockers(source._id, dest._id));

  const moves = [];
  for (const { collection, field, label } of [...FIELD_MOVES, ...ARRAY_MOVES]) {
    const count = await collection.find({ [field]: source._id }).countAsync();
    if (count > 0) moves.push({ label, count });
  }
  const dupAttestations = await duplicateAttestations(source._id, dest._id);
  const movedAttestations = await Attestations.find({ memberId: source._id }).countAsync() - dupAttestations.length;
  if (movedAttestations > 0) moves.push({ label: 'Attestations', count: movedAttestations });
  if (dupAttestations.length > 0) {
    moves.push({ label: 'Attestations dropped, destination already has them', count: dupAttestations.length });
  }
  const collisions = await groupCollisions(source._id, dest._id);
  const groupRows = await GroupMemberships.find({ memberId: source._id }).countAsync() - collisions.length;
  if (groupRows > 0) moves.push({ label: 'Group memberships', count: groupRows });
  if (collisions.length > 0) {
    moves.push({ label: 'Group memberships merged, both were in the same group', count: collisions.length });
  }

  const sourceMemberships = await Memberships.find({ mid: source._id }).fetchAsync();
  const destMemberships = await Memberships.find({ mid: dest._id }).fetchAsync();
  for (const s of sourceMemberships) {
    for (const d of destMemberships) {
      if (overlaps(s, d)) {
        warnings.push(`Membership ${fmt(s.start)} – ${fmt(membershipEnd(s))} overlaps the destination's `
          + `${fmt(d.start)} – ${fmt(membershipEnd(d))}. It is moved as is; adjust the dates afterwards if needed.`);
      }
    }
  }

  const dependents = await Members.find({ infamily: { $in: [source._id, dest._id] } }).countAsync();
  if (dependents > MAX_FAMILY_DEPENDENTS) {
    warnings.push(`The family will have ${dependents} members, more than the ${MAX_FAMILY_DEPENDENTS} allowed.`);
  }

  if (source.email && source.email !== dest.email) {
    const accounts = await Meteor.users.find(userSelectorForMember(source), { fields: { emails: 1 } }).fetchAsync();
    for (const account of accounts) {
      if (dest.email && normalizedEmails(account).includes(dest.email)) continue;
      warnings.push(`The account ${account.emails.map((e) => e.address).join(', ')} finds the member through `
        + 'the source\'s email. After the merge it finds no member, unless the destination gets that email first.');
    }
  }

  return {
    source: await membersSummary(source),
    dest: await membersSummary(dest),
    moves,
    copies: fieldCopies(source, dest).map(({ field, label, shown }) => ({ field, label, shown })),
    blockers,
    warnings,
  };
};

/**
 * Move everything from source to dest and remove source.
 *
 * @return {Promise<object>} the plan that was carried out
 */
export const mergeMembers = async (source, dest) => {
  const plan = await planMemberMerge(source, dest);
  if (plan.blockers.length > 0) {
    throw new Meteor.Error('merge-blocked', plan.blockers.join(' '));
  }

  // Before the plain moves, so the unique indexes and the one-per-certificate
  // rule never see two rows for the destination.
  for (const attestation of await duplicateAttestations(source._id, dest._id)) {
    await Attestations.removeAsync(attestation._id);
  }
  await Attestations.updateAsync({ memberId: source._id }, { $set: { memberId: dest._id } }, { multi: true });

  const affectedGroups = new Set();
  for (const { source: s, dest: d } of await groupCollisions(source._id, dest._id)) {
    affectedGroups.add(s.groupId);
    if (s.state === 'active' && d.state !== 'active') {
      await GroupMemberships.removeAsync(d._id);
    } else {
      await GroupMemberships.removeAsync(s._id);
    }
  }
  for (const row of await GroupMemberships.find({ memberId: source._id }).fetchAsync()) {
    affectedGroups.add(row.groupId);
  }
  await GroupMemberships.updateAsync({ memberId: source._id }, { $set: { memberId: dest._id } }, { multi: true });

  for (const { collection, field } of FIELD_MOVES) {
    await collection.updateAsync({ [field]: source._id }, { $set: { [field]: dest._id } }, { multi: true });
  }
  for (const { collection, field } of ARRAY_MOVES) {
    for (const doc of await collection.find({ [field]: source._id }).fetchAsync()) {
      const ids = [...new Set(doc[field].map((id) => (id === source._id ? dest._id : id)))];
      await collection.updateAsync(doc._id, { $set: { [field]: ids } });
    }
  }

  const copies = fieldCopies(source, dest);
  if (copies.length > 0) {
    await Members.updateAsync(dest._id, { $set: Object.fromEntries(copies.map((c) => [c.field, c.value])) });
  }

  await Comments.insertAsync({
    about: dest._id,
    created: new Date(),
    text: `Merged member ${source.mid} (${source.name}) into this member: `
      + (plan.moves.map((m) => `${m.count} ${m.label.toLowerCase()}`).join(', ') || 'nothing to move')
      + '.'
      + (copies.length ? ` Took over ${copies.map((c) => `${c.label.toLowerCase()} ${c.shown}`).join(', ')}.` : ''),
  });

  await Members.removeAsync(source._id);

  await updateMember(await Members.findOneAsync(dest._id));
  await reconcileStorageState({ ownerIds: [dest._id] });
  for (const groupId of affectedGroups) await syncLinkedRoleById(groupId);

  return plan;
};

import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { check, Match } from 'meteor/check';
import { Members } from '/imports/common/collections/members';
import { planMemberMerge, mergeMembers } from '../memberMerge';
import { reminderStateOf } from '/imports/common/server/members/memberList';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import {
  MEMBER_DETAIL_FIELDS, createMember, updateMemberDetails, setRegistered, setExcluded, refreshMemberDates,
  removeMember, addFamilyMember, removeFromFamily, memberDetail, memberExport, memberDraftFromPayment, pendingMembers,
} from '/imports/common/server/members/members';
import { sendAutoWelcome } from '../messages/messages';

const roles = DOMAIN_ROLES.members;
const Details = Object.fromEntries(MEMBER_DETAIL_FIELDS.map((f) => [f, Match.Optional(Match.OneOf(null, String, Boolean, Number, Date))]));
const as = (context) => ({ userId: context.userId });

const requireAdmin = async () => {
  if (!Meteor.userId() || !(await Roles.userIsInRoleAsync(Meteor.userId(), 'admin'))) {
    throw new Meteor.Error('not-authorized', 'Admin role required');
  }
};

// The admin types member numbers, which are what is shown on member pages.
const memberByNumber = async (mid, role) => {
  check(mid, String);
  const member = await Members.findOneAsync({ mid: mid.trim() });
  if (!member) throw new Meteor.Error('not-found', `No member with number ${mid} (${role})`);
  return member;
};

Meteor.methods({
  'members.mergePreview': async (sourceMid, destMid) => {
    await requireAdmin();
    return planMemberMerge(
      await memberByNumber(sourceMid, 'source'),
      await memberByNumber(destMid, 'destination'),
    );
  },

  'members.merge': async (sourceMid, destMid) => {
    await requireAdmin();
    return mergeMembers(
      await memberByNumber(sourceMid, 'source'),
      await memberByNumber(destMid, 'destination'),
    );
  },

  async 'members.get'(memberId) {
    check(memberId, String);
    await requireRole(this.userId, roles);
    const member = await Members.findOneAsync(memberId, { fields: { storagequeue: 0, storagerequest: 0, notificationPrefs: 0 } });
    return member && { ...member, reminderState: reminderStateOf(member) };
  },
  async 'members.detail'(memberId) {
    check(memberId, String);
    await requireRole(this.userId, roles);
    return memberDetail(memberId);
  },
  async 'members.create'(fields, { infamily, paymentId }) {
    check(fields, Details);
    check(infamily, Match.OneOf(null, String));
    check(paymentId, Match.OneOf(null, String));
    await requireRole(this.userId, roles);
    return createMember(fields, { infamily, paymentId, ...as(this) });
  },
  async 'members.update'(memberId, fields, expectedUpdatedAt) {
    check(memberId, String);
    check(fields, Details);
    check(expectedUpdatedAt, Match.OneOf(null, Date));
    await requireRole(this.userId, roles);
    await updateMemberDetails(memberId, fields, { ...as(this), expectedUpdatedAt });
  },
  async 'members.setRegistered'(memberId, on) {
    check(memberId, String);
    check(on, Boolean);
    await requireRole(this.userId, roles);
    await setRegistered(memberId, on, as(this));
  },
  async 'members.setExcluded'(memberId, on) {
    check(memberId, String);
    check(on, Boolean);
    await requireRole(this.userId, roles);
    await setExcluded(memberId, on, as(this));
  },
  async 'members.refreshDates'(memberId) {
    check(memberId, String);
    await requireRole(this.userId, roles);
    await refreshMemberDates(memberId, as(this));
  },
  async 'members.remove'(memberId) {
    check(memberId, String);
    await requireRole(this.userId, roles);
    await removeMember(memberId, as(this));
  },
  async 'members.addToFamily'(payerId, memberId) {
    check(payerId, String);
    check(memberId, String);
    await requireRole(this.userId, roles);
    await addFamilyMember(payerId, memberId, as(this));
  },
  async 'members.removeFromFamily'(memberId) {
    check(memberId, String);
    await requireRole(this.userId, roles);
    await removeFromFamily(memberId, as(this));
  },
  async 'members.export'(kind) {
    check(kind, Match.OneOf('current', 'all'));
    await requireRole(this.userId, roles);
    return memberExport(kind);
  },
  async 'members.draftFromPayment'(paymentId) {
    check(paymentId, String);
    await requireRole(this.userId, roles);
    return memberDraftFromPayment(paymentId);
  },
  /** Members waiting for the board to accept them. */
  async 'members.pending'() {
    await requireRole(this.userId, roles);
    return (await pendingMembers()).map((m) => ({ ...m, reminderState: reminderStateOf(m) }));
  },
  /** Accept a member, and welcome them if an automatic template fits. */
  async 'members.acceptPending'(memberId) {
    check(memberId, String);
    await requireRole(this.userId, roles);
    await setRegistered(memberId, true, as(this));
    return sendAutoWelcome(memberId, as(this));
  },
});

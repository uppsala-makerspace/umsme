import { Meteor } from 'meteor/meteor';

/**
 * Data for the member lists. The pages' containers use this; the pure
 * components never do.
 */

/** A page of a member list view: 'all', 'excluded' or 'reminders'. */
export const memberPage = (view) => ({ page, pageSize, sort, search }) =>
  Meteor.callAsync('adminMembers.page', { view, page, pageSize, sort, search });

export const runReminderJob = () => Meteor.callAsync('reminders.runNow');

/** A page of a family's candidates: members who may join the payer's family. */
export const familyCandidatePage = (patronId) => ({ page, pageSize, sort, search }) =>
  Meteor.callAsync('adminMembers.page', { view: 'familyCandidates', patronId, page, pageSize, sort, search });

export const getMember = (memberId) => Meteor.callAsync('members.get', memberId);
export const memberDetail = (memberId) => Meteor.callAsync('members.detail', memberId);
export const createMember = (fields, { infamily, paymentId }) => Meteor.callAsync('members.create', fields, { infamily: infamily || null, paymentId: paymentId || null });
export const updateMember = (memberId, fields, expectedUpdatedAt) => Meteor.callAsync('members.update', memberId, fields, expectedUpdatedAt ?? null);
export const setRegistered = (memberId, on) => Meteor.callAsync('members.setRegistered', memberId, on);
export const setExcluded = (memberId, on) => Meteor.callAsync('members.setExcluded', memberId, on);
export const refreshDates = (memberId) => Meteor.callAsync('members.refreshDates', memberId);
export const removeMember = (memberId) => Meteor.callAsync('members.remove', memberId);
export const addToFamily = (payerId, memberId) => Meteor.callAsync('members.addToFamily', payerId, memberId);
export const removeFromFamily = (memberId) => Meteor.callAsync('members.removeFromFamily', memberId);
export const cancelInvite = (inviteId) => Meteor.callAsync('adminCancelInvite', { inviteId });
export const memberDraftFromPayment = (paymentId) => Meteor.callAsync('members.draftFromPayment', paymentId);

/** Download the members as a CSV file: 'current' or 'all'. */
export const downloadMembers = async (kind) => {
  const rows = await Meteor.callAsync('members.export', kind);
  const csv = rows.map((r) => r.join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = kind === 'current' ? 'active_members.csv' : 'all_members.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/** Where a member's public status page is. */
export const publicMemberPage = (memberId) => `${Meteor.settings.public?.checkPath || '../check/'}${memberId}`;

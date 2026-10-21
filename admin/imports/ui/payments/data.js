import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { StoreItems } from '/imports/common/collections/storeItems';

/**
 * Data for the payment and membership pages: the methods, and the store
 * items for the purchases filter. The pages' containers use this; the pure
 * components never do.
 */

/** A page of a tab: 'manual', 'automatic', 'memberships' or 'store'. */
export const paymentPage = (tab, storeItem) => ({ page, pageSize, sort, search }) =>
  Meteor.callAsync('payments.page', { tab, storeItem: storeItem || null, page, pageSize, sort, search });

export const useStoreItemOptions = () => useTracker(() => {
  Meteor.subscribe('admin.storeItems.list');
  return StoreItems.find({}, { sort: { 'name.sv': 1 } }).map((item) => ({
    value: item._id, label: `${item.name?.sv || item.code} (${item.code})${item.status === 'hidden' ? ' – hidden' : ''}`,
  }));
}, []);

/** The personal number the bank is signed into with, kept on the user. */
export const usePnr = () => useTracker(() => Meteor.user()?.profile?.pnr || '', []);
export const setPnr = (pnr) => Meteor.callAsync('setPnr', pnr);
export const checkBank = () => Meteor.callAsync('checkBank');
export const initiateBank = () => Meteor.callAsync('initiateBank');
export const signOutBank = () => Meteor.callAsync('clearSession');
export const synchronizeBank = () => Meteor.callAsync('synchronize');

export const paymentDetail = (paymentId) => Meteor.callAsync('payments.detail', paymentId);
export const assignMember = (paymentId, memberId) => Meteor.callAsync('payments.assignMember', paymentId, memberId);
export const unassignMember = (paymentId) => Meteor.callAsync('payments.unassignMember', paymentId);
export const setOther = (paymentId, other) => Meteor.callAsync('payments.setOther', paymentId, other);
export const linkMembership = (paymentId, membershipId) => Meteor.callAsync('payments.linkMembership', paymentId, membershipId);
export const unlinkMembership = (paymentId) => Meteor.callAsync('payments.unlinkMembership', paymentId);
export const removePayment = (paymentId) => Meteor.callAsync('payments.remove', paymentId);

export const suggestMembership = (memberId, paymentId) => Meteor.callAsync('memberships.suggest', memberId, paymentId || null);
/** The start is a day picked, read as local midnight. */
export const createMembership = ({ memberId, paymentId, startDay, amount }) => Meteor.callAsync('memberships.create', {
  memberId, paymentId: paymentId || null, start: new Date(`${startDay}T00:00:00`), amount: Number(amount),
});
export const membershipDetail = (membershipId) => Meteor.callAsync('memberships.detail', membershipId);
export const updateMembership = (membershipId, fields, expectedUpdatedAt) => Meteor.callAsync('memberships.update', membershipId, fields, expectedUpdatedAt ?? null);
export const removeMembership = (membershipId) => Meteor.callAsync('memberships.remove', membershipId);

import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { Messages } from '/imports/common/collections/messages';

/** The messages to a member, or about a membership: { member } or { membership }. */
export const useMessages = (about) => useTracker(() => {
  const handle = Meteor.subscribe('admin.messages.of', about);
  return { loading: !handle.ready(), messages: Messages.find(about, { sort: { senddate: -1 } }).fetch() };
}, [about.member, about.membership]);

export const membershipTemplate = (memberId, membershipId, type) => Meteor.callAsync('messages.membershipTemplate', memberId, membershipId, type);
export const reminderTemplate = (memberId) => Meteor.callAsync('messages.reminderTemplate', memberId);
export const composeMessage = (memberId, templateId, membershipId) => Meteor.callAsync('messages.compose', memberId, templateId, membershipId || null);
export const sendMessage = (message) => Meteor.callAsync('messages.send', message);
export const messageDetail = (docId) => Meteor.callAsync('messages.detail', docId);
export const removeMessage = (docId) => Meteor.callAsync('messages.remove', docId);
export const setReminded = (memberId, reminded) => Meteor.callAsync('messages.setReminded', memberId, reminded);

/** Where a message is written: the member, the template, and the membership if any. */
export const sendPath = ({ memberId, templateId, membershipId }) =>
  `/message/send?member=${memberId}&template=${templateId}${membershipId ? `&membership=${membershipId}` : ''}`;

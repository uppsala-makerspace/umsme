import { Meteor } from 'meteor/meteor';

/** The member id for an email and member number, or nothing if they do not match. */
export const findMemberId = (email, mid) => Meteor.callAsync('findMemberId', email, mid);

export const mailMembershipStatus = (email) => Meteor.callAsync('mailAboutMemberShip', email);

/** A member's status: { member: boolean, info: { name, id, member, lab, storage, infamily } }. */
export const memberStatus = (memberId) => Meteor.callAsync('storageCheck', memberId);

/** Where the status pages live, as the website embeds them. */
export const checkPath = () => Meteor.settings.public?.checkPath || '../check/';

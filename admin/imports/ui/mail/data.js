import { Meteor } from 'meteor/meteor';

/**
 * Data for the mail pages: the methods. The pages' containers use this; the
 * pure components never do.
 */

export const mailList = () => Meteor.callAsync('mails.list');
export const mailDetail = (mailId) => Meteor.callAsync('mails.detail', mailId);
export const removeMail = (mailId) => Meteor.callAsync('mails.remove', mailId);
/** Resolves to the announcement's id. */
export const mailToAnnouncement = (mailId) => Meteor.callAsync('mails.toAnnouncement', mailId);
export const mailSenders = () => Meteor.callAsync('mails.senders');
export const mailRecipients = (recipients, family) => Meteor.callAsync('mails.recipients', { recipients, family });
/** Resolves to { mailId, sent, failed }. */
export const sendMail = (mail) => Meteor.callAsync('mails.send', mail);

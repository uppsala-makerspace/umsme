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
/** `since` a day ("2026-07-01") or empty for any. */
export const mailRecipients = (recipients, family, since) => Meteor.callAsync('mails.recipients', { recipients, family, since: since ? new Date(`${since}T00:00:00`) : null });
/** Resolves to { mailId, total }; the mail goes out in the background. */
export const sendMail = ({ since, ...mail }) => Meteor.callAsync('mails.send', { ...mail, since: since ? new Date(`${since}T00:00:00`) : null });
/** Resolves to the mail going out now ({ _id, subject, total, sent, failed }), or nothing. */
export const mailSending = () => Meteor.callAsync('mails.sending');

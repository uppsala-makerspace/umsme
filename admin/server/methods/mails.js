import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { announcementFromMail } from '/imports/common/server/announcements/announcements';
import { mailRecipients, sendGroupMail, mailSending, mailList, mailDetail, removeMail, retryMail, acceptMail } from '../mail/mails';

const group = { recipients: String, family: Boolean, since: Match.Optional(Match.OneOf(null, Date)) };

Meteor.methods({
  async 'mails.list'() {
    await requireRole(this.userId, DOMAIN_ROLES.mails);
    return mailList();
  },
  async 'mails.detail'(mailId) {
    check(mailId, String);
    await requireRole(this.userId, DOMAIN_ROLES.mails);
    return mailDetail(mailId);
  },
  async 'mails.remove'(mailId) {
    check(mailId, String);
    await requireRole(this.userId, DOMAIN_ROLES.mails);
    await removeMail(mailId, { userId: this.userId });
  },
  async 'mails.toAnnouncement'(mailId) {
    check(mailId, String);
    await requireRole(this.userId, DOMAIN_ROLES.announcements);
    return announcementFromMail(mailId, { userId: this.userId });
  },
  /** The senders a mail may come from, as settings.from lists them. */
  async 'mails.senders'() {
    await requireRole(this.userId, DOMAIN_ROLES.sendMail);
    const f = Meteor.settings.from;
    return Array.isArray(f) ? f : [f];
  },
  async 'mails.recipients'(options) {
    check(options, group);
    await requireRole(this.userId, DOMAIN_ROLES.sendMail);
    return mailRecipients({ ...options, since: options.since || undefined });
  },
  async 'mails.send'(mail) {
    check(mail, {
      ...group, from: String, subject: String, template: String, format: String,
      only: Match.Optional([String]), announcementId: Match.Optional(String),
    });
    await requireRole(this.userId, DOMAIN_ROLES.sendMail);
    const { mailId, total } = await sendGroupMail(mail, { userId: this.userId });
    return { mailId, total };
  },
  /** Send again to those a mail failed for; it goes on in the background. */
  async 'mails.retry'(mailId) {
    check(mailId, String);
    await requireRole(this.userId, DOMAIN_ROLES.sendMail);
    await retryMail(mailId, { userId: this.userId });
  },
  /** Settle for a mail some did not get: it is sent, and another can go out. */
  async 'mails.accept'(mailId) {
    check(mailId, String);
    await requireRole(this.userId, DOMAIN_ROLES.sendMail);
    await acceptMail(mailId, { userId: this.userId });
  },
  /** The mail under way, if any, and how far it has come. */
  async 'mails.sending'() {
    await requireRole(this.userId, DOMAIN_ROLES.mails);
    return mailSending();
  },
});

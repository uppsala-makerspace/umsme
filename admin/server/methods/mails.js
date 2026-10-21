import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { announcementFromMail } from '/imports/common/server/announcements/announcements';
import { mailRecipients, sendGroupMail, mailList, mailDetail, removeMail } from '../mail/mails';

const group = { recipients: String, family: Boolean };

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
    return mailRecipients(options);
  },
  async 'mails.send'(mail) {
    check(mail, {
      ...group, from: String, subject: String, template: String, format: String,
      only: Match.Optional([String]), announcementId: Match.Optional(String),
    });
    await requireRole(this.userId, DOMAIN_ROLES.sendMail);
    this.unblock();
    return sendGroupMail(mail, { userId: this.userId });
  },
});

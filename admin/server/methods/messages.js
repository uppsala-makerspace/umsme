import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Messages } from '/imports/common/collections/messages';
import { Members } from '/imports/common/collections/members';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import {
  membershipTemplate, reminderTemplate, composeMessage, sendMessage, removeMessage, setReminded,
} from '../messages/messages';

const Id = Match.OneOf(null, String);

Meteor.methods({
  /** The template for a welcome or confirmation of a membership. */
  async 'messages.membershipTemplate'(memberId, membershipId, type) {
    check(memberId, String);
    check(membershipId, String);
    check(type, Match.OneOf('welcome', 'confirmation'));
    await requireRole(this.userId, DOMAIN_ROLES.messages);
    return membershipTemplate(memberId, membershipId, type);
  },
  async 'messages.reminderTemplate'(memberId) {
    check(memberId, String);
    await requireRole(this.userId, DOMAIN_ROLES.messages);
    return reminderTemplate(memberId);
  },
  async 'messages.compose'(memberId, templateId, membershipId) {
    check(memberId, String);
    check(templateId, String);
    check(membershipId, Id);
    await requireRole(this.userId, DOMAIN_ROLES.messages);
    return composeMessage(memberId, templateId, membershipId);
  },
  async 'messages.send'(message) {
    check(message, { memberId: String, templateId: String, membershipId: Id, to: String, subject: String, messagetext: String });
    await requireRole(this.userId, DOMAIN_ROLES.sendMail);
    return sendMessage(message, { userId: this.userId });
  },
  /** A message and whom it went to. */
  async 'messages.detail'(docId) {
    check(docId, String);
    await requireRole(this.userId, DOMAIN_ROLES.messages);
    const message = await Messages.findOneAsync(docId);
    if (!message) throw new Meteor.Error('not-found', 'No such message');
    const member = await Members.findOneAsync(message.member, { fields: { name: 1 } });
    return { message, memberName: member?.name || message.member };
  },
  async 'messages.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, DOMAIN_ROLES.messages);
    await removeMessage(docId, { userId: this.userId });
  },
  async 'messages.setReminded'(memberId, reminded) {
    check(memberId, String);
    check(reminded, Boolean);
    await requireRole(this.userId, DOMAIN_ROLES.messages);
    await setReminded(memberId, reminded, { userId: this.userId });
  },
});

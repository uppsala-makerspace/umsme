import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Messages } from '/imports/common/collections/messages';
import { MessageTemplates } from '/imports/common/collections/templates';
import { messageData } from '/imports/common/lib/message';
import { memberStatus } from '/imports/common/lib/utils';
import { reminderDays } from '/imports/common/lib/rules';
import { pushMessage } from '/imports/common/server/push';
import { recordChange } from '/imports/common/server/auditLog';
import { sendMail } from '../mail/send';

/**
 * Messages (meddelanden) to one member, from a template: a welcome or a
 * confirmation of payment for a membership, a reminder that it ends, or a
 * status. Sent as a mail and kept, with a push to the member's app.
 */

const memberTypeOf = (member) => (member.family === true ? 'family' : member.youth === true ? 'youth' : 'normal');

/**
 * The template for a welcome or a confirmation of a membership: the member
 * type and membership type exactly, or for a youth the normal one.
 */
export const membershipTemplate = async (memberId, membershipId, type) => {
  const member = await Members.findOneAsync(memberId);
  const membership = await Memberships.findOneAsync(membershipId);
  if (!member || !membership) throw new Meteor.Error('not-found', 'No such member or membership');
  const membertype = memberTypeOf(member);
  const membershiptype = membership.type;
  let template = await MessageTemplates.findOneAsync({ type, membertype, membershiptype, deprecated: false });
  if (!template && membertype === 'youth') {
    template = await MessageTemplates.findOneAsync({ type, membertype: 'normal', membershiptype, deprecated: false });
  }
  if (!template) {
    const mt = membertype === 'youth' ? 'youth/normal' : membertype;
    throw new Meteor.Error('no-template', `No non-deprecated template of type "${type}" with member type "${mt}" and membership type "${membershiptype}" found.`);
  }
  return template._id;
};

/** The reminder template for what of the member's membership ends within the reminder window, if anything does. */
export const reminderTemplate = async (memberId) => {
  const member = await Members.findOneAsync(memberId);
  if (!member) throw new Meteor.Error('not-found', 'No such member');
  const { memberEnd, labEnd } = await memberStatus(member);
  const soon = new Date();
  soon.setDate(soon.getDate() + reminderDays);
  const lately = new Date();
  lately.setDate(lately.getDate() - reminderDays);
  const lab = labEnd < soon && labEnd > lately;
  const membership = memberEnd < soon && memberEnd > lately;
  if (!lab && !membership) throw new Meteor.Error('not-due', 'Neither lab or regular membership is due in the next two weeks, no need to send reminder.');
  const membershiptype = lab && membership ? 'labandmember' : (membership ? 'member' : 'lab');
  const membertype = memberTypeOf(member);
  const template = (await MessageTemplates.findOneAsync({ type: 'reminder', membertype, membershiptype, deprecated: false }))
    || (await MessageTemplates.findOneAsync({ type: 'reminder', membershiptype, deprecated: false }));
  if (!template) throw new Meteor.Error('no-template', `No non-deprecated template of type "reminder" with member type "${membertype}" and membership type "${membershiptype}" found.`);
  return template._id;
};

/** The message a template makes for a member: recipient, subject and text, to look over before sending. */
export const composeMessage = async (memberId, templateId, membershipId) => {
  const member = await Members.findOneAsync(memberId, { fields: { name: 1, email: 1 } });
  const template = await MessageTemplates.findOneAsync(templateId, { fields: { type: 1, name: 1 } });
  if (!member || !template) throw new Meteor.Error('not-found', 'No such member or template');
  const data = await messageData(memberId, templateId, { membershipId: membershipId || undefined });
  return { memberName: member.name, templateType: template.type, templateName: template.name, to: data.to || member.email, subject: data.subject, messagetext: data.messagetext };
};

/**
 * Send a message as a mail and keep it; a reminder marks the member
 * reminded. The push to the app is best effort.
 *
 * @returns {Promise<string>} the message's id
 */
export const sendMessage = async ({ memberId, templateId, membershipId, to, subject, messagetext }, { userId }) => {
  const template = await MessageTemplates.findOneAsync(templateId);
  if (!template || !(await Members.findOneAsync(memberId))) throw new Meteor.Error('not-found', 'No such member or template');
  await sendMail({ to, subject, text: messagetext });
  const doc = {
    template: templateId, member: memberId, ...(membershipId ? { membership: membershipId } : {}),
    type: template.type, to, subject, messagetext, senddate: new Date(),
  };
  const docId = await Messages.insertAsync(doc);
  if (template.type === 'reminder') await Members.updateAsync(memberId, { $set: { reminder: new Date() } });
  await recordChange({ userId, domain: 'messages', action: 'send', docId, after: doc });
  pushMessage(docId).catch((err) => console.error('Failed to send message push:', err));
  return docId;
};

export const removeMessage = async (docId, { userId }) => {
  const before = await Messages.findOneAsync(docId);
  if (!before) throw new Meteor.Error('not-found', 'No such message');
  await Messages.removeAsync(docId);
  await recordChange({ userId, domain: 'messages', action: 'remove', docId, before });
};

/** Mark the member reminded now, or as needing a reminder. */
export const setReminded = async (memberId, reminded, { userId }) => {
  const before = await Members.findOneAsync(memberId, { fields: { reminder: 1 } });
  if (!before) throw new Meteor.Error('not-found', 'No such member');
  await Members.updateAsync(memberId, reminded ? { $set: { reminder: new Date() } } : { $unset: { reminder: '' } });
  await recordChange({ userId, domain: 'members', action: reminded ? 'markReminded' : 'markReminderNeeded', docId: memberId, before, after: await Members.findOneAsync(memberId, { fields: { reminder: 1 } }) });
};

import { template } from 'underscore';
import { Members } from '/imports/common/collections/members';
import { Memberships } from "/imports/common/collections/memberships";
import { MessageTemplates } from '/imports/common/collections/templates';
import { memberStatus } from '/imports/common/lib/utils';
import moment from 'moment';


const niceDate = (date) => {
  if (date) {
    return moment(date).format("YYYY-MM-DD");
  }
  return '';
};

/**
 * Find the best matching non-deprecated message template.
 * Priority: 1) exact match on membertype + membershiptype,
 *           2) match on membershiptype only,
 *           3) any template matching type and auto flag.
 *
 * @param {Object} params
 * @param {boolean} params.auto - Whether to match auto templates
 * @param {string} params.type - Message type (welcome, confirmation, reminder, status)
 * @param {string} params.membershiptype - Membership type (member, lab, labandmember)
 * @param {string} params.membertype - Member type (normal, family, youth)
 * @returns {Object|null} The best matching template, or null
 */
export const findBestTemplate = async (params) => {
  const { auto, type, membershiptype, membertype } = params;
  const base = { type, deprecated: false };
  if (auto !== undefined) base.auto = auto;

  return await MessageTemplates.findOneAsync({ ...base, membertype, membershiptype })
    || await MessageTemplates.findOneAsync({ ...base, membershiptype })
    || await MessageTemplates.findOneAsync(base)
    || null;
};

export const messageData = async (memberId, templateId, membershipId) => {
  let familyMembers = [];
  await Members.find({infamily: memberId}).forEachAsync((m) => familyMembers.push(m.name));
  familyMembers = familyMembers.join(', ');
  const member = await Members.findOneAsync(memberId);
  const messageTemplate = await MessageTemplates.findOneAsync(templateId);
  if (!member || !messageTemplate) {
    return {};
  }
  const status = memberStatus(member);
  const data = {
    id: member._id,
    mid: member.mid,
    name: member.name,
    email: member.email,
    family: member.family === true,
    familyMembers,
    youth: member.youth === true,
    liability: member.liability === true,
    memberStartDate: niceDate(status.memberStart),
    memberEndDate: niceDate(member.member),
    labStartDate: niceDate(status.labStart),
    labEndDate: niceDate(member.lab)
  };
  if (membershipId) {
    const membership = await Memberships.findOneAsync(membershipId);
    data.amount = membership.amount;
    data.type = membership.type;
    data.discount = membership.discount;
    data.startPeriod = niceDate(membership.start);
    data.endMemberPeriod = niceDate(membership.memberend);
    data.endLabPeriod = niceDate(membership.labend);
  }
  const subjectTemplate = template(messageTemplate.subject);
  const messageTextTemplate = template(messageTemplate.messagetext);
  const smsTemplate = messageTemplate.sms ? template(messageTemplate.sms) : null;
  return {
    to: member.email,
    subject: subjectTemplate(data),
    messagetext: messageTextTemplate(data),
    sms: smsTemplate ? smsTemplate(data): null,
  }
}
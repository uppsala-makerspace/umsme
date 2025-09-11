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

export const messageData = async (memberId, templateId, membershipId) => {
  let familyMembers = [];
  Members.find({infamily: memberId}).forEach((m) => familyMembers.push(m.name));
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
    labEndDate: niceDate(member.lab),
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
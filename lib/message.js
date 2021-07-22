import { _ } from 'underscore';
import { Members } from '/collections/members';
import { Memberships } from "/collections/memberships";
import { MessageTemplates } from '/collections/templates';
import { memberStatus } from '/lib/utils';

const niceDate = (date) => {
  if (date) {
    return moment(date).format("YYYY-MM-DD");
  }
  return '';
};

export const messageData = (memberId, templateId, membershipId) => {
  let familyMembers = [];
  Members.find({infamily: memberId}).forEach((m) => familyMembers.push(m.name));
  familyMembers = familyMembers.join(', ');
  const member = Members.findOne(memberId);
  const status = memberStatus(member);
  const template = MessageTemplates.findOne(templateId);
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
    const membership = Memberships.findOne(membershipId);
    data.amount = membership.amount;
    data.type = membership.type;
    data.discount = membership.discount;
    data.startPeriod = niceDate(membership.start);
    data.endMemberPeriod = niceDate(membership.memberend);
    data.endLabPeriod = niceDate(membership.labend);
  }
  const subjectTemplate = _.template(template.subject);
  const messageTemplate = _.template(template.messagetext);
  return {
    to: member.email,
    subject: subjectTemplate(data),
    messagetext: messageTemplate(data),
  }
}
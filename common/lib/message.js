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
 *
 * The auto flag is asymmetric:
 *   - `auto: false` (or omitted) is the manual-send path. Templates flagged
 *     `auto: true` are reserved for automation and must NEVER surface here,
 *     so we hard-filter them out before scoring.
 *   - `auto: true` is the automation path. Auto templates are preferred but
 *     a non-auto template is an acceptable fallback.
 *
 * Auto-flag agreement wins first, specificity breaks ties. So for an
 * `auto: true` caller we exhaust all auto-flagged candidates by specificity
 * before falling back to any non-auto template:
 *
 *   1. auto matches  + membertype + membershiptype
 *   2. auto matches  + membershiptype
 *   3. auto matches  + any
 *   4. auto reversed + membertype + membershiptype  (auto=true callers only)
 *   5. auto reversed + membershiptype               (auto=true callers only)
 *   6. auto reversed + any                          (auto=true callers only)
 *
 * For `auto: false` callers the lower three ranks aren't reachable because
 * auto-flagged templates have already been filtered out — the ranking
 * collapses to pure specificity over the non-auto pool.
 *
 * @param {Object} params
 * @param {boolean} [params.auto=false] - Preferred value of the template's auto flag
 * @param {string} params.type - Message type (welcome, confirmation, reminder, status)
 * @param {string} params.membershiptype - Membership type (member, lab, labandmember)
 * @param {string} params.membertype - Member type (normal, family, youth)
 * @returns {Object|null} The best matching template, or null if none exist
 */
export const findBestTemplate = async (params) => {
  const { auto = false, type, membershiptype, membertype } = params;

  let candidates = await MessageTemplates.find({ type, deprecated: false }).fetchAsync();
  if (!auto) {
    // Manual path: hide automation-only templates from the manual flow entirely.
    candidates = candidates.filter((tpl) => !tpl.auto);
  }
  if (candidates.length === 0) return null;

  const score = (tpl) => {
    const fullMatch = tpl.membertype === membertype && tpl.membershiptype === membershiptype;
    const membershipMatch = tpl.membershiptype === membershiptype;
    const autoMatch = !!tpl.auto === auto;

    // Auto-flag agreement is the outer ranking; specificity is the
    // tie-breaker inside each half.
    if (autoMatch && fullMatch) return 6;
    if (autoMatch && membershipMatch) return 5;
    if (autoMatch) return 4;
    if (fullMatch) return 3;
    if (membershipMatch) return 2;
    return 1;
  };

  return candidates.reduce(
    (best, tpl) => (score(tpl) > score(best) ? tpl : best),
    candidates[0]
  );
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
    pending: !member.registered,
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
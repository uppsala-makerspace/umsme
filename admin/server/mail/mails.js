import { Meteor } from 'meteor/meteor';
import { template } from 'underscore';
import { marked } from 'marked';
import removeMd from 'remove-markdown';
import { Members } from '/imports/common/collections/members';
import { Mails } from '/imports/common/collections/mails';
import { Comments } from '/imports/common/collections/comments';
import { Announcements } from '/imports/common/collections/announcements';
import { memberStatus } from '/imports/common/lib/utils';
import { recordChange } from '/imports/common/server/auditLog';
import { markAnnouncementSent, pushAnnouncementToMembers } from '/imports/common/server/announcements/announcements';
import { sendMail } from './send';

/**
 * Group mail (utskick): a mail written here, rendered for and sent to each
 * member of a group, and the record of it in Mails (who got it, who did
 * not). Sending from an announcement marks the announcement sent and pushes
 * it to the members' phones.
 */

const DOMAIN = 'mails';
export const RECIPIENT_GROUPS = ['members', 'labmembers', 'yearmembers', 'recentmembers'];
export const FORMATS = ['raw', 'markdown', 'plaintext'];

const day = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');

// As the Blaze page had it: "current year" counts from the first of February.
const inGroup = (status, group, now) => {
  const yearStart = new Date(now.getFullYear(), 1, 1);
  const lastYear = new Date(now);
  lastYear.setFullYear(now.getFullYear() - 1);
  switch (group) {
    case 'members': return status.memberEnd > now;
    case 'labmembers': return status.labEnd > now;
    case 'yearmembers': return status.memberEnd > yearStart;
    case 'recentmembers': return status.memberEnd > lastYear;
    default: throw new Meteor.Error('bad-recipients', `No recipient group "${group}"`);
  }
};

/**
 * The members of a group with an email, not excluded, and what a template
 * can say about each; family members only with `family`.
 *
 * @returns {Promise<object[]>} `to` is "Name <email>"
 */
export const mailRecipients = async ({ recipients, family }, now = new Date()) => {
  if (!RECIPIENT_GROUPS.includes(recipients)) throw new Meteor.Error('bad-recipients', `No recipient group "${recipients}"`);
  const members = await Members.find({ excluded: { $ne: true } }).fetchAsync();
  const familyNames = {};
  for (const m of members) if (m.infamily) (familyNames[m.infamily] ||= []).push(m.name);
  const result = [];
  for (const member of members) {
    if (!member.email || (!family && member.infamily)) continue;
    const status = await memberStatus(member);
    if (!inGroup(status, recipients, now)) continue;
    result.push({
      to: `${member.name} <${member.email}>`,
      name: member.name,
      email: member.email,
      family: member.family === true,
      familyMembers: (familyNames[member._id] || []).join(', '),
      youth: member.youth === true,
      liability: member.liability === true,
      memberStartDate: day(status.memberStart),
      memberEndDate: day(member.member),
      labStartDate: day(status.labStart),
      labEndDate: day(member.lab),
      pending: !member.registered,
    });
  }
  return result;
};

const senders = () => {
  const f = Meteor.settings.from;
  return Array.isArray(f) ? f : [f];
};

/**
 * Render a template for one recipient, in a format: raw (as written),
 * markdown (also as HTML) or plain text (markdown taken away).
 */
export const renderMail = ({ subject, template: text, format }, data) => {
  const raw = template(text)(data);
  return {
    subject: template(subject)(data),
    text: format === 'plaintext' ? removeMd(raw, { stripListLeaders: false }) : raw,
    html: format === 'markdown' ? marked.parse(raw, { breaks: true }) : undefined,
  };
};

/**
 * Send a mail to a group, or to those of it in `only` (by email), one
 * recipient at a time, and record it. A recipient whose mail fails is
 * recorded as failed; the rest still get theirs.
 *
 * @returns {Promise<{ mailId: string, sent: number, failed: number }>}
 */
export const sendGroupMail = async ({ from, recipients, family, subject, template: text, format, only, announcementId }, { userId }) => {
  if (!senders().includes(from)) throw new Meteor.Error('bad-from', `Mail can not be sent from ${from}`);
  if (!FORMATS.includes(format)) throw new Meteor.Error('bad-format', `No format "${format}"`);
  if (!subject.trim() || !text.trim()) throw new Meteor.Error('bad-mail', 'A mail needs a subject and a text');
  if (announcementId && !(await Announcements.findOneAsync(announcementId))) throw new Meteor.Error('not-found', 'No such announcement');
  let list = await mailRecipients({ recipients, family });
  if (only) {
    const wanted = new Set(only.map((e) => e.toLowerCase()));
    list = list.filter((r) => wanted.has(r.email.toLowerCase()));
  }
  // Render every mail first, so that a template that does not render stops before anything is sent.
  let rendered;
  try {
    rendered = list.map((data) => ({ data, mail: renderMail({ subject, template: text, format }, data) }));
  } catch (e) {
    throw new Meteor.Error('bad-template', `The mail does not render: ${e.message}`);
  }
  const to = [];
  const failed = [];
  for (const { data, mail } of rendered) {
    try {
      await sendMail({ to: data.email, from, ...mail });
      to.push(data.to);
    } catch (e) {
      console.log(`Failed sending to "${data.to}" due to: ${e.reason || e.message}`);
      failed.push(data.to);
    }
  }
  const doc = {
    from, recipients, family, subject, senddate: new Date(), to, failed,
    template: format === 'plaintext' ? removeMd(text, { stripListLeaders: false }) : text,
    ...(format === 'markdown' ? { formatted: true } : {}),
  };
  const mailId = await Mails.insertAsync(doc);
  await recordChange({ userId, domain: DOMAIN, action: 'send', docId: mailId, after: { ...doc, to: to.length, failed: failed.length } });
  if (announcementId) {
    await markAnnouncementSent(announcementId, mailId, { userId });
    pushAnnouncementToMembers(announcementId).catch((e) => console.error('Failed to send announcement push:', e));
  }
  return { mailId, sent: to.length, failed: failed.length };
};

/** The sent mails, newest first, without their texts. */
export const mailList = async () => (await Mails.find({}, { fields: { template: 0 }, sort: { senddate: -1 } }).fetchAsync())
  .map(({ to, failed, ...mail }) => ({ ...mail, sent: to?.length || 0, failed: failed?.length || 0 }));

/** A sent mail and the announcement it was sent for, if any. */
export const mailDetail = async (mailId) => {
  const mail = await Mails.findOneAsync(mailId);
  if (!mail) throw new Meteor.Error('not-found', 'No such mail');
  const announcement = await Announcements.findOneAsync({ mailId }, { fields: { subjectSv: 1 } });
  return { mail, announcement: announcement || null };
};

/** Remove the record of a mail and the comments about it; the announcement it was for stays, sent. */
export const removeMail = async (mailId, { userId }) => {
  const { mail: before } = await mailDetail(mailId);
  await Comments.removeAsync({ about: mailId });
  await Announcements.updateAsync({ mailId }, { $unset: { mailId: '' } }, { multi: true });
  await Mails.removeAsync(mailId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId: mailId, before });
};

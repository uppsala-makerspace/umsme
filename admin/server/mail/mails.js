import { Meteor } from 'meteor/meteor';
import { Memberships } from '/imports/common/collections/memberships';
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
 * not). The mail is recorded at once and goes out in the background, one
 * recipient at a time, its record growing as it does; only one goes out at a
 * time. Sending from an announcement marks the announcement sent and pushes
 * it to the members' phones once every mail is out.
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

/** When each member first paid, by member id: their earliest membership's start. */
const firstPaid = async () => {
  const rows = await Memberships.rawCollection().aggregate([{ $group: { _id: '$mid', first: { $min: '$start' } } }]).toArray();
  return Object.fromEntries(rows.map((r) => [r._id, r.first]));
};

/**
 * The members of a group with an email, not excluded, and what a template
 * can say about each; family members only with `family`; with `since`, only
 * those who first paid on or after it (a family member counts from when the
 * family's payer did). Longest a member first.
 *
 * @returns {Promise<object[]>} `to` is "Name <email>", `memberSince` the day they first paid
 */
export const mailRecipients = async ({ recipients, family, since }, now = new Date()) => {
  if (!RECIPIENT_GROUPS.includes(recipients)) throw new Meteor.Error('bad-recipients', `No recipient group "${recipients}"`);
  const members = await Members.find({ excluded: { $ne: true } }).fetchAsync();
  const first = await firstPaid();
  const familyNames = {};
  for (const m of members) if (m.infamily) (familyNames[m.infamily] ||= []).push(m.name);
  const result = [];
  for (const member of members) {
    if (!member.email || (!family && member.infamily)) continue;
    const status = await memberStatus(member);
    if (!inGroup(status, recipients, now)) continue;
    const joined = first[member.infamily || member._id] || null;
    if (since && !(joined && joined >= since)) continue;
    result.push({
      memberSince: day(joined),
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
  return result.sort((a, b) => (a.memberSince || '9999').localeCompare(b.memberSince || '9999'));
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

/** The mail going out now, if any. */
export const mailSending = async () => {
  const mail = await Mails.findOneAsync({ status: 'sending' }, { fields: { subject: 1, total: 1, to: 1, failed: 1, senddate: 1 } });
  return mail && { _id: mail._id, subject: mail.subject, total: mail.total, sent: mail.to.length, failed: mail.failed.length, senddate: mail.senddate };
};

/** Send the rendered mails, recording each recipient as they go, then finish. */
const deliver = async (mailId, rendered, { from, announcementId, userId }) => {
  for (const { data, mail } of rendered) {
    try {
      await sendMail({ to: data.email, from, ...mail });
      await Mails.updateAsync(mailId, { $push: { to: data.to } });
    } catch (e) {
      console.log(`Failed sending to "${data.to}" due to: ${e.reason || e.message}`);
      await Mails.updateAsync(mailId, { $push: { failed: data.to } });
    }
  }
  await Mails.updateAsync(mailId, { $set: { status: 'sent' } });
  const done = await Mails.findOneAsync(mailId);
  await recordChange({ userId, domain: DOMAIN, action: 'sent', docId: mailId, after: { to: done.to.length, failed: done.failed.length } });
  if (announcementId) {
    await markAnnouncementSent(announcementId, mailId, { userId });
    pushAnnouncementToMembers(announcementId).catch((e) => console.error('Failed to send announcement push:', e));
  }
};

/**
 * Send a mail to a group, or to those of it in `only` (by email): recorded
 * at once, sent in the background (see mailSending). Refused while another
 * mail goes out, and for a template that does not render, before anything
 * is sent.
 *
 * @returns {Promise<{ mailId: string, total: number, done: Promise<void> }>} `done` settles when the last mail is out
 */
export const sendGroupMail = async ({ from, recipients, family, since, subject, template: text, format, only, announcementId }, { userId }) => {
  if (!senders().includes(from)) throw new Meteor.Error('bad-from', `Mail can not be sent from ${from}`);
  if (!FORMATS.includes(format)) throw new Meteor.Error('bad-format', `No format "${format}"`);
  if (!subject.trim() || !text.trim()) throw new Meteor.Error('bad-mail', 'A mail needs a subject and a text');
  if (announcementId && !(await Announcements.findOneAsync(announcementId))) throw new Meteor.Error('not-found', 'No such announcement');
  if (await mailSending()) throw new Meteor.Error('busy', 'Another mail is being sent; wait until it is done');
  let list = await mailRecipients({ recipients, family, since });
  if (only) {
    const wanted = new Set(only.map((e) => e.toLowerCase()));
    list = list.filter((r) => wanted.has(r.email.toLowerCase()));
  }
  if (list.length === 0) throw new Meteor.Error('no-recipients', 'There is nobody to send to');
  let rendered;
  try {
    rendered = list.map((data) => ({ data, mail: renderMail({ subject, template: text, format }, data) }));
  } catch (e) {
    throw new Meteor.Error('bad-template', `The mail does not render: ${e.message}`);
  }
  const doc = {
    from, recipients, family, subject, senddate: new Date(), to: [], failed: [], status: 'sending', total: rendered.length,
    template: format === 'plaintext' ? removeMd(text, { stripListLeaders: false }) : text,
    ...(format === 'markdown' ? { formatted: true } : {}),
    ...(announcementId ? { announcementId } : {}),
  };
  let mailId;
  try {
    mailId = await Mails.insertAsync(doc);
  } catch (e) {
    // The unique index on status "sending": another mail started meanwhile.
    if (e.code === 11000 || /duplicate key/.test(e.message)) throw new Meteor.Error('busy', 'Another mail is being sent; wait until it is done');
    throw e;
  }
  await recordChange({ userId, domain: DOMAIN, action: 'send', docId: mailId, after: { ...doc, to: undefined, failed: undefined } });
  const done = deliver(mailId, rendered, { from, announcementId, userId })
    .catch(async (e) => {
      console.error(`Group mail ${mailId} stopped:`, e);
      await Mails.updateAsync(mailId, { $set: { status: 'interrupted' } });
    });
  return { mailId, total: rendered.length, done };
};

/** Only one mail goes out at a time; one the server stopped sending is marked interrupted. */
export const setUpMails = async () => {
  await Mails.rawCollection().createIndex({ status: 1 }, { unique: true, partialFilterExpression: { status: 'sending' }, name: 'oneMailSending' });
  const { modifiedCount } = await Mails.rawCollection().updateMany({ status: 'sending' }, { $set: { status: 'interrupted' } });
  if (modifiedCount) console.log(`Marked ${modifiedCount} group mail(s) interrupted by a restart`);
};

/** The sent mails, newest first, without their texts. */
export const mailList = async () => (await Mails.find({}, { fields: { template: 0 }, sort: { senddate: -1 } }).fetchAsync())
  .map(({ to, failed, ...mail }) => ({ ...mail, status: mail.status || 'sent', sent: to?.length || 0, failed: failed?.length || 0 }));

/** A sent mail and the announcement it was sent for, if any. */
export const mailDetail = async (mailId) => {
  const mail = await Mails.findOneAsync(mailId);
  if (!mail) throw new Meteor.Error('not-found', 'No such mail');
  const announcement = await Announcements.findOneAsync(mail.announcementId ? { $or: [{ mailId }, { _id: mail.announcementId }] } : { mailId }, { fields: { subjectSv: 1 } });
  return { mail: { ...mail, status: mail.status || 'sent' }, announcement: announcement || null };
};

/** Remove the record of a mail and the comments about it; not while it goes out, nor one an announcement was sent as. */
export const removeMail = async (mailId, { userId }) => {
  const { mail: before, announcement } = await mailDetail(mailId);
  if (before.status === 'sending') throw new Meteor.Error('sending', 'The mail is still being sent');
  if (announcement) throw new Meteor.Error('announcement', 'The mail is the record of a sent announcement and can not be deleted');
  await Comments.removeAsync({ about: mailId });
  await Mails.removeAsync(mailId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId: mailId, before });
};

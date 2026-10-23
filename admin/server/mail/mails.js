import { Meteor } from 'meteor/meteor';
import { Memberships } from '/imports/common/collections/memberships';
import { template } from 'underscore';
import { marked } from 'marked';
import removeMd from 'remove-markdown';
import { Members } from '/imports/common/collections/members';
import { Mails } from '/imports/common/collections/mails';
import { Comments } from '/imports/common/collections/comments';
import { Announcements } from '/imports/common/collections/announcements';
import { statusFromMemberships } from '/imports/common/lib/utils';
import { recordChange } from '/imports/common/server/auditLog';
import { markAnnouncementSent, pushAnnouncementToMembers } from '/imports/common/server/announcements/announcements';
import { sendMail } from './send';

/**
 * Group mail (utskick): a mail written here, rendered for and sent to each
 * member of a group, and the record of it in Mails (who got it, who did
 * not). The mail is recorded at once and goes out in the background, one
 * recipient at a time, its record growing as it does; a recipient whose mail
 * fails is passed by, and a restart goes on where it stopped. When all have
 * had their turn the mail is sent, or, if some failed, waits for a decision:
 * try them again, or settle for it (OK). Only one mail is under way (sending
 * or waiting) at a time. Sending from an announcement marks the announcement
 * sent, and pushes it to the members' phones, when the mail is sent.
 */

const DOMAIN = 'mails';
export const RECIPIENT_GROUPS = ['members', 'labmembers', 'yearmembers', 'recentmembers'];
export const FORMATS = ['raw', 'markdown', 'plaintext'];
/**
 * An announcement is for everyone, which means every active member and
 * their family members, not those whose membership has run out nor the
 * excluded: its mail goes to them, and so does its push.
 */
export const ANNOUNCEMENT_RECIPIENTS = { recipients: 'members', family: true };

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

/** Every membership, by the member it is for, in the database's order. */
const membershipsByMember = async () => {
  const byMember = {};
  for (const ms of await Memberships.find({}, { fields: { mid: 1, type: 1, start: 1, memberend: 1, labend: 1, discount: 1, family: 1 } }).fetchAsync()) {
    (byMember[ms.mid] ||= []).push(ms);
  }
  return byMember;
};

/** When a member first paid: their earliest membership's start. */
const firstPaid = (memberships) => memberships.reduce((first, ms) => (ms.start && (!first || ms.start < first) ? ms.start : first), null);

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
  // All memberships at once: one query, not one per member.
  const [members, memberships] = await Promise.all([Members.find({ excluded: { $ne: true } }).fetchAsync(), membershipsByMember()]);
  const familyNames = {};
  for (const m of members) if (m.infamily) (familyNames[m.infamily] ||= []).push(m.name);
  const result = [];
  for (const member of members) {
    if (!member.email || (!family && member.infamily)) continue;
    const own = memberships[member.infamily || member._id] || [];
    const status = statusFromMemberships(own, now);
    if (!inGroup(status, recipients, now)) continue;
    const joined = firstPaid(own);
    if (since && !(joined && joined >= since)) continue;
    result.push({
      memberId: member._id,
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

// The recipients still to go and those to try again, with what their mail
// is rendered from; kept on the mail while it is under way, not shown.
const WORK_FIELDS = { queue: 0, retry: 0, source: 0 };

/** The mail under way, if any: going out, or waiting for a decision on those it failed for. */
export const mailSending = async () => {
  const mail = await Mails.findOneAsync({ active: true }, { fields: { subject: 1, total: 1, to: 1, failed: 1, senddate: 1, status: 1 } });
  return mail && { _id: mail._id, subject: mail.subject, status: mail.status, total: mail.total, sent: mail.to.length, failed: mail.failed.length, senddate: mail.senddate };
};

/** The mail is sent: no longer under way, and its announcement, if any, marked sent and pushed. */
const finish = async (mailId, { userId }) => {
  await Mails.updateAsync(mailId, { $set: { status: 'sent' }, $unset: { active: '', queue: '', retry: '', source: '' } });
  const mail = await Mails.findOneAsync(mailId);
  await recordChange({ userId, domain: DOMAIN, action: 'sent', docId: mailId, after: { to: mail.to.length, failed: mail.failed.length } });
  if (mail.announcementId) {
    await markAnnouncementSent(mail.announcementId, mailId, { userId });
    // To everyone an announcement is for as things stand now, as the mail was.
    mailRecipients(ANNOUNCEMENT_RECIPIENTS)
      .then((everyone) => pushAnnouncementToMembers(mail.announcementId, everyone.map((r) => r.memberId)))
      .catch((e) => console.error('Failed to send announcement push:', e));
  }
};

const running = new Map();

/**
 * Send to the mail's queue, first to last, taking each recipient off it as
 * their mail goes or fails; then finish, or wait for a decision if some
 * failed. One loop per mail at a time.
 *
 * @returns {Promise<void>} settles when the queue is empty
 */
const deliver = (mailId, { userId }) => {
  if (running.has(mailId)) return running.get(mailId);
  const loop = (async () => {
    const mail = await Mails.findOneAsync(mailId);
    const { from, subject, format } = mail;
    for (const data of mail.queue || []) {
      let sent = false;
      try {
        await sendMail({ to: data.email, from, ...renderMail({ subject, template: mail.source, format }, data) });
        sent = true;
      } catch (e) {
        console.log(`Failed sending to "${data.to}" due to: ${e.reason || e.message}`);
      }
      await Mails.updateAsync(mailId, sent
        ? { $pop: { queue: -1 }, $push: { to: data.to } }
        : { $pop: { queue: -1 }, $push: { failed: data.to, retry: data } });
    }
    // Done with the queue: a try again from here on starts a loop of its own.
    if (running.get(mailId) === loop) running.delete(mailId);
    const after = await Mails.findOneAsync(mailId, { fields: { failed: 1 } });
    if (after.failed.length) await Mails.updateAsync(mailId, { $set: { status: 'review' } });
    else await finish(mailId, { userId });
  })().catch((e) => console.error(`Group mail ${mailId} stopped; it goes on at the next start:`, e))
    .finally(() => { if (running.get(mailId) === loop) running.delete(mailId); });
  running.set(mailId, loop);
  return loop;
};

/**
 * Send a mail to a group, or to those of it in `only` (by email): recorded
 * at once, sent in the background (see mailSending). The mail of an
 * announcement takes no choice of recipients: it goes to
 * ANNOUNCEMENT_RECIPIENTS. Refused while another
 * mail is under way, and for a template that does not render, before
 * anything is sent.
 *
 * @returns {Promise<{ mailId: string, total: number, done: Promise<void> }>} `done` settles when every recipient has had their turn
 */
export const sendGroupMail = async ({ from, recipients, family, since, subject, template: text, format, only, announcementId }, { userId }) => {
  if (!senders().includes(from)) throw new Meteor.Error('bad-from', `Mail can not be sent from ${from}`);
  if (!FORMATS.includes(format)) throw new Meteor.Error('bad-format', `No format "${format}"`);
  if (!subject.trim() || !text.trim()) throw new Meteor.Error('bad-mail', 'A mail needs a subject and a text');
  if (announcementId) {
    if (!(await Announcements.findOneAsync(announcementId))) throw new Meteor.Error('not-found', 'No such announcement');
    if (recipients !== ANNOUNCEMENT_RECIPIENTS.recipients || family !== ANNOUNCEMENT_RECIPIENTS.family || since || only) {
      throw new Meteor.Error('announcement-recipients', 'An announcement goes to every current member; its recipients can not be chosen');
    }
  }
  if (await mailSending()) throw new Meteor.Error('busy', 'Another mail is under way; wait until it is done');
  let list = await mailRecipients({ recipients, family, since });
  if (only) {
    const wanted = new Set(only.map((e) => e.toLowerCase()));
    list = list.filter((r) => wanted.has(r.email.toLowerCase()));
  }
  if (list.length === 0) throw new Meteor.Error('no-recipients', 'There is nobody to send to');
  try {
    for (const data of list) renderMail({ subject, template: text, format }, data);
  } catch (e) {
    throw new Meteor.Error('bad-template', `The mail does not render: ${e.message}`);
  }
  const doc = {
    from, recipients, family, subject, senddate: new Date(), to: [], failed: [], status: 'sending', active: true, total: list.length,
    template: format === 'plaintext' ? removeMd(text, { stripListLeaders: false }) : text,
    source: text, format, queue: list, retry: [],
    ...(format === 'markdown' ? { formatted: true } : {}),
    ...(announcementId ? { announcementId } : {}),
  };
  let mailId;
  try {
    mailId = await Mails.insertAsync(doc);
  } catch (e) {
    // The unique index on active: another mail started meanwhile.
    if (e.code === 11000 || /duplicate key/.test(e.message)) throw new Meteor.Error('busy', 'Another mail is under way; wait until it is done');
    throw e;
  }
  const { queue, retry, source, ...shown } = doc;
  await recordChange({ userId, domain: DOMAIN, action: 'send', docId: mailId, after: { ...shown, to: undefined, failed: undefined } });
  return { mailId, total: list.length, done: deliver(mailId, { userId }) };
};

const waiting = async (mailId) => {
  const mail = await Mails.findOneAsync(mailId, { fields: { status: 1 } });
  if (!mail) throw new Meteor.Error('not-found', 'No such mail');
  if (mail.status !== 'review') throw new Meteor.Error('not-waiting', 'The mail is not waiting for a decision');
};

/**
 * Try those the mail failed for again: they go back on the queue, the rest
 * stays as it is.
 *
 * @returns {Promise<{ done: Promise<void> }>} `done` settles when they have had their turn
 */
export const retryMail = async (mailId, { userId }) => {
  await waiting(mailId);
  const mail = await Mails.findOneAsync(mailId, { fields: { retry: 1 } });
  await Mails.updateAsync(mailId, { $set: { status: 'sending', queue: mail.retry, retry: [], failed: [] } });
  await recordChange({ userId, domain: DOMAIN, action: 'retry', docId: mailId, after: { recipients: mail.retry.length } });
  return { done: deliver(mailId, { userId }) };
};

/** Settle for a mail some did not get: it is sent, and those it failed for stay on record. */
export const acceptMail = async (mailId, { userId }) => {
  await waiting(mailId);
  await finish(mailId, { userId });
};

/**
 * Only one mail is under way at a time; one a restart cut short goes on
 * where it stopped.
 *
 * @returns {Promise<Promise<void>[]>} the loops that went on, each settling when done
 */
export const setUpMails = async () => {
  await Mails.rawCollection().createIndex({ active: 1 }, { unique: true, partialFilterExpression: { active: true }, name: 'oneMailUnderWay' });
  return (await Mails.find({ status: 'sending' }, { fields: { _id: 1 } }).fetchAsync()).map((mail) => {
    console.log(`Going on with group mail ${mail._id}`);
    return deliver(mail._id, { userId: null });
  });
};

/** The sent mails, newest first, without their texts. */
export const mailList = async () => (await Mails.find({}, { fields: { template: 0, ...WORK_FIELDS }, sort: { senddate: -1 } }).fetchAsync())
  .map(({ to, failed, ...mail }) => ({ ...mail, status: mail.status || 'sent', sent: to?.length || 0, failed: failed?.length || 0 }));

/** A mail and the announcement it was sent for, if any. */
export const mailDetail = async (mailId) => {
  const mail = await Mails.findOneAsync(mailId, { fields: WORK_FIELDS });
  if (!mail) throw new Meteor.Error('not-found', 'No such mail');
  const announcement = await Announcements.findOneAsync(mail.announcementId ? { $or: [{ mailId }, { _id: mail.announcementId }] } : { mailId }, { fields: { subjectSv: 1 } });
  return { mail: { ...mail, status: mail.status || 'sent' }, announcement: announcement || null };
};

/** Remove the record of a mail and the comments about it; not while it goes out, nor one an announcement was sent as. */
export const removeMail = async (mailId, { userId }) => {
  const { mail: before, announcement } = await mailDetail(mailId);
  if (before.status === 'sending' || before.status === 'review') throw new Meteor.Error('sending', 'The mail is still under way');
  if (announcement) throw new Meteor.Error('announcement', 'The mail is the record of a sent announcement and can not be deleted');
  await Comments.removeAsync({ about: mailId });
  await Mails.removeAsync(mailId);
  await recordChange({ userId, domain: DOMAIN, action: 'remove', docId: mailId, before });
};

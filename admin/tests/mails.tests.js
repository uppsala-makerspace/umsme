import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Mails } from '/imports/common/collections/mails';
import { Announcements } from '/imports/common/collections/announcements';
import { Comments } from '/imports/common/collections/comments';
import { ANNOUNCEMENT_RECIPIENTS, mailRecipients, sendGroupMail, renderMail, removeMail, mailDetail, mailSending, setUpMails, retryMail, acceptMail } from '/server/mail/mails';
import { announcementFromMail } from '/imports/common/server/announcements/announcements';

const prefix = 'mailtest-';
const DAY = 86400000;
const now = new Date();
const user = { userId: `${prefix}admin` };

const member = async (key, { memberDays, labDays = null, ...fields } = {}) => {
  const _id = `${prefix}${key}`;
  await Members.insertAsync({ _id, mid: key, name: `Mail ${key}`, email: `${_id}@example.org`, ...fields });
  if (memberDays !== undefined) {
    await Memberships.insertAsync({
      mid: fields.infamily || _id, start: new Date(now - 300 * DAY), type: labDays === null ? 'member' : 'labandmember', amount: 1,
      memberend: new Date(now.getTime() + memberDays * DAY), ...(labDays !== null ? { labend: new Date(now.getTime() + labDays * DAY) } : {}),
    });
  }
  return _id;
};

const cleanup = async () => {
  await Members.removeAsync({ _id: { $regex: `^${prefix}` } });
  await Memberships.removeAsync({ mid: { $regex: `^${prefix}` } });
  await Mails.removeAsync({ subject: { $regex: `^${prefix}` } });
  await Announcements.removeAsync({ subjectSv: { $regex: `^${prefix}` } });
};

const ours = (list) => list.filter((r) => r.email.startsWith(prefix)).map((r) => r.name).sort();

describe('group mail', function () {
  const deliver = Meteor.settings.deliverMails;
  const from = Meteor.settings.from;
  const whitelist = Meteor.settings.private?.recipientWhitelist;
  /** Mail "goes" without leaving the test: delivered, to a whitelist of nobody. */
  const delivering = () => {
    Meteor.settings.deliverMails = true;
    Meteor.settings.private = { ...Meteor.settings.private, recipientWhitelist: [] };
  };
  before(async function () {
    await cleanup();
    await setUpMails();
    Meteor.settings.from = ['sender@example.org'];
    await member('current', { memberDays: 30, labDays: 30 });
    const payer = await member('payer', { memberDays: 30, family: true });
    await member('dependent', { infamily: payer, member: new Date(now.getTime() + 30 * DAY) });
    await member('lapsed', { memberDays: -30 });
    await member('excluded', { memberDays: 30, excluded: true });
  });
  after(async function () {
    Meteor.settings.deliverMails = deliver;
    Meteor.settings.from = from;
    Meteor.settings.private = { ...Meteor.settings.private, recipientWhitelist: whitelist };
    await cleanup();
  });

  it('finds the current members, family members only when asked', async function () {
    assert.deepStrictEqual(ours(await mailRecipients({ recipients: 'members', family: false })), ['Mail current', 'Mail payer']);
    assert.deepStrictEqual(ours(await mailRecipients({ recipients: 'members', family: true })), ['Mail current', 'Mail dependent', 'Mail payer']);
    assert.deepStrictEqual(ours(await mailRecipients({ recipients: 'labmembers', family: false })), ['Mail current']);
    assert.deepStrictEqual(ours(await mailRecipients({ recipients: 'recentmembers', family: false })), ['Mail current', 'Mail lapsed', 'Mail payer']);
    const payer = (await mailRecipients({ recipients: 'members', family: false })).find((r) => r.name === 'Mail payer');
    assert.strictEqual(payer.familyMembers, 'Mail dependent');
  });

  it('renders a template for a recipient, in each format', function () {
    const data = { name: 'Alice' };
    assert.deepStrictEqual(renderMail({ subject: 'Hej <%= name %>', template: '**Hej** <%= name %>', format: 'raw' }, data),
      { subject: 'Hej Alice', text: '**Hej** Alice', html: undefined });
    assert.strictEqual(renderMail({ subject: 's', template: '**Hej**', format: 'plaintext' }, data).text, 'Hej');
    assert.match(renderMail({ subject: 's', template: '**Hej**', format: 'markdown' }, data).html, /<strong>Hej<\/strong>/);
  });

  const groupMail = (fields = {}) => ({
    from: 'sender@example.org', recipients: 'labmembers', family: false, subject: `${prefix}subject`, template: 'Hej <%= name %>',
    format: 'raw', only: [`${prefix}current@example.org`], ...fields,
  });

  // An announcement's mail goes to every current member, family too, with no choosing.
  const announcementMail = (announcementId) => ({
    from: 'sender@example.org', recipients: 'members', family: true, subject: `${prefix}subject`, template: 'Hej <%= name %>', format: 'raw', announcementId,
  });

  it('sends an announcement, mail and push, to the active members and their families only', async function () {
    const everyone = await mailRecipients(ANNOUNCEMENT_RECIPIENTS);
    assert.deepStrictEqual(ours(everyone), ['Mail current', 'Mail dependent', 'Mail payer']);
    assert.ok(everyone.every((r) => r.memberId));
  });

  it('refuses to narrow down the recipients of an announcement', async function () {
    const announcementId = await Announcements.insertAsync({ type: 'information', subjectSv: `${prefix}n`, bodySv: 'x', status: 'draft', createdAt: now });
    await assert.rejects(sendGroupMail(groupMail({ announcementId }), user), /announcement-recipients/);
    await assert.rejects(sendGroupMail({ ...announcementMail(announcementId), since: new Date() }, user), /announcement-recipients/);
    await assert.rejects(sendGroupMail({ ...announcementMail(announcementId), family: false }, user), /announcement-recipients/);
  });

  it('sends in the background and, when all got it, marks the mail and its announcement sent', async function () {
    delivering();
    const announcementId = await Announcements.insertAsync({ type: 'information', subjectSv: `${prefix}a`, bodySv: 'x', status: 'draft', createdAt: now });
    const { mailId, total, done } = await sendGroupMail(announcementMail(announcementId), user);
    assert.ok(total >= 3);
    await done;
    assert.strictEqual(await mailSending(), undefined);
    const mail = await Mails.findOneAsync(mailId);
    assert.deepStrictEqual([mail.status, mail.active, mail.queue, mail.to.length], ['sent', undefined, undefined, total]);
    assert.ok(mail.to.includes(`Mail dependent <${prefix}dependent@example.org>`));
    const announcement = await Announcements.findOneAsync(announcementId);
    assert.strictEqual(announcement.status, 'sent');
    assert.strictEqual(announcement.mailId, mailId);
    assert.strictEqual((await mailDetail(mailId)).announcement._id, announcementId);
    await assert.rejects(removeMail(mailId, user), /announcement/);
  });

  it('waits for a decision on those it failed for: try again, then OK', async function () {
    Meteor.settings.deliverMails = false;
    const announcementId = await Announcements.insertAsync({ type: 'information', subjectSv: `${prefix}b`, bodySv: 'x', status: 'draft', createdAt: now });
    const { mailId, done } = await sendGroupMail(announcementMail(announcementId), user);
    await done;
    let mail = await Mails.findOneAsync(mailId);
    const failed = mail.failed.length;
    assert.ok(failed >= 3);
    assert.deepStrictEqual([mail.status, mail.active, mail.retry.length], ['review', true, failed]);
    assert.strictEqual((await mailSending()).status, 'review');
    await assert.rejects(sendGroupMail(groupMail(), user), /busy/);
    assert.strictEqual((await Announcements.findOneAsync(announcementId)).status, 'draft');

    await (await retryMail(mailId, user)).done;
    mail = await Mails.findOneAsync(mailId);
    assert.deepStrictEqual([mail.status, mail.failed.length], ['review', failed]);

    await acceptMail(mailId, user);
    mail = await Mails.findOneAsync(mailId);
    assert.deepStrictEqual([mail.status, mail.active, mail.failed.length], ['sent', undefined, failed]);
    assert.strictEqual((await Announcements.findOneAsync(announcementId)).status, 'sent');
    await assert.rejects(acceptMail(mailId, user), /not-waiting/);
  });

  it('tries again and, when the rest get it, is sent by itself', async function () {
    Meteor.settings.deliverMails = false;
    const { mailId, done } = await sendGroupMail(groupMail(), user);
    await done;
    delivering();
    await (await retryMail(mailId, user)).done;
    const mail = await Mails.findOneAsync(mailId);
    assert.deepStrictEqual([mail.status, mail.failed, mail.to.length], ['sent', [], 1]);
  });

  it('goes on after a restart where it stopped', async function () {
    delivering();
    const data = (await mailRecipients({ recipients: 'labmembers', family: false })).find((r) => r.email === `${prefix}current@example.org`);
    const mailId = await Mails.insertAsync({
      from: 'sender@example.org', recipients: 'labmembers', family: false, subject: `${prefix}resumed`, senddate: now, template: 'Hej',
      to: ['Somebody <somebody@example.org>'], failed: [], status: 'sending', active: true, total: 2, source: 'Hej <%= name %>', format: 'raw', queue: [data], retry: [],
    });
    await Promise.all(await setUpMails());
    const mail = await Mails.findOneAsync(mailId);
    assert.deepStrictEqual([mail.status, mail.to.length], ['sent', 2]);
  });

  it('sends one mail at a time', async function () {
    const sending = await Mails.insertAsync({ from: 'a@example.org', recipients: 'members', family: false, to: [], failed: [], subject: `${prefix}busy`, senddate: now, template: 'x', status: 'review', active: true, total: 5 });
    try {
      assert.strictEqual((await mailSending())._id, sending);
      const mail = { from: 'sender@example.org', recipients: 'members', family: false, subject: `${prefix}s2`, template: 'x', format: 'raw' };
      await assert.rejects(sendGroupMail(mail, user), /busy/);
      await assert.rejects(Mails.insertAsync({ ...mail, to: [], senddate: now, status: 'sending', active: true }), /duplicate key/);
      await assert.rejects(removeMail(sending, user), /sending/);
    } finally {
      await Mails.removeAsync(sending);
    }
  });

  it('finds only those who first paid since a day, longest a member first', async function () {
    const since = new Date(now - 100 * DAY);
    await Memberships.insertAsync({ mid: `${prefix}current`, start: new Date(now - 10 * DAY), type: 'member', amount: 1, memberend: new Date(now.getTime() + 30 * DAY) });
    const lateId = await member('late', { memberDays: 30 });
    await Memberships.updateAsync({ mid: lateId }, { $set: { start: new Date(now - 5 * DAY) } }, { multi: true });
    try {
      // Everyone here first paid 300 days ago but "late".
      assert.deepStrictEqual(ours(await mailRecipients({ recipients: 'members', family: true, since })), ['Mail late']);
      const all = (await mailRecipients({ recipients: 'members', family: false })).filter((r) => r.email.startsWith(prefix));
      assert.strictEqual(all.at(-1).name, 'Mail late');
    } finally {
      await Members.removeAsync(lateId);
      await Memberships.removeAsync({ mid: lateId });
      await Memberships.removeAsync({ mid: `${prefix}current`, start: { $gt: since } });
    }
  });

  it('refuses an unknown sender and a template that does not render, before sending', async function () {
    const mail = { from: 'sender@example.org', recipients: 'members', family: false, subject: `${prefix}s`, template: '<%= missing %>', format: 'raw' };
    await assert.rejects(sendGroupMail({ ...mail, from: 'evil@example.org' }, user), /bad-from/);
    await assert.rejects(sendGroupMail(mail, user), /bad-template/);
    assert.strictEqual(await Mails.find({ subject: `${prefix}s` }).countAsync(), 0);
  });

  it('makes an announcement of a mail once, after which the mail stays', async function () {
    const mailId = await Mails.insertAsync({ from: 'a@example.org', recipients: 'members', family: false, to: [], subject: `${prefix}old`, senddate: now, template: 'Text' });
    const announcementId = await announcementFromMail(mailId, user);
    assert.strictEqual(await announcementFromMail(mailId, user), announcementId);
    await Announcements.updateAsync(announcementId, { $set: { subjectSv: `${prefix}old` } });
    await assert.rejects(removeMail(mailId, user), /announcement/);
    await Announcements.removeAsync(announcementId);
    await Comments.insertAsync({ about: mailId, text: 'x', created: now });
    await removeMail(mailId, user);
    assert.strictEqual(await Mails.findOneAsync(mailId), undefined);
    assert.strictEqual(await Comments.find({ about: mailId }).countAsync(), 0);
  });
});

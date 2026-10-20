import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Mails } from '/imports/common/collections/mails';
import { Announcements } from '/imports/common/collections/announcements';
import { Comments } from '/imports/common/collections/comments';
import { mailRecipients, sendGroupMail, renderMail, removeMail, mailDetail } from '/server/mail/mails';
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
  before(async function () {
    await cleanup();
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

  it('records who failed when mail is not delivered, and marks the announcement sent', async function () {
    Meteor.settings.deliverMails = false;
    const announcementId = await Announcements.insertAsync({ type: 'information', subjectSv: `${prefix}a`, bodySv: 'x', status: 'draft', createdAt: now });
    const { mailId, sent, failed } = await sendGroupMail({
      from: 'sender@example.org', recipients: 'labmembers', family: false, subject: `${prefix}subject`, template: 'Hej <%= name %>',
      format: 'raw', only: [`${prefix}current@example.org`], announcementId,
    }, user);
    assert.deepStrictEqual([sent, failed], [0, 1]);
    const mail = await Mails.findOneAsync(mailId);
    assert.deepStrictEqual(mail.failed, [`Mail current <${prefix}current@example.org>`]);
    const announcement = await Announcements.findOneAsync(announcementId);
    assert.strictEqual(announcement.status, 'sent');
    assert.strictEqual(announcement.mailId, mailId);
    assert.strictEqual((await mailDetail(mailId)).announcement._id, announcementId);
  });

  it('refuses an unknown sender and a template that does not render, before sending', async function () {
    const mail = { from: 'sender@example.org', recipients: 'members', family: false, subject: `${prefix}s`, template: '<%= missing %>', format: 'raw' };
    await assert.rejects(sendGroupMail({ ...mail, from: 'evil@example.org' }, user), /bad-from/);
    await assert.rejects(sendGroupMail(mail, user), /bad-template/);
    assert.strictEqual(await Mails.find({ subject: `${prefix}s` }).countAsync(), 0);
  });

  it('makes an announcement of a mail once, and removes a mail leaving the announcement', async function () {
    const mailId = await Mails.insertAsync({ from: 'a@example.org', recipients: 'members', family: false, to: [], subject: `${prefix}old`, senddate: now, template: 'Text' });
    const announcementId = await announcementFromMail(mailId, user);
    assert.strictEqual(await announcementFromMail(mailId, user), announcementId);
    await Announcements.updateAsync(announcementId, { $set: { subjectSv: `${prefix}old` } });
    await Comments.insertAsync({ about: mailId, text: 'x', created: now });
    await removeMail(mailId, user);
    assert.strictEqual(await Mails.findOneAsync(mailId), undefined);
    assert.strictEqual(await Comments.find({ about: mailId }).countAsync(), 0);
    const announcement = await Announcements.findOneAsync(announcementId);
    assert.strictEqual(announcement.status, 'sent');
    assert.strictEqual(announcement.mailId, undefined);
  });
});

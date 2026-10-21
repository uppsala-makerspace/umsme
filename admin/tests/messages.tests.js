import assert from 'assert';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Messages } from '/imports/common/collections/messages';
import { MessageTemplates } from '/imports/common/collections/templates';
import '/server/methods/messages';

const prefix = 'msgtest-';
const admin = `${prefix}admin`;
const board = `${prefix}board`;
const memberId = `${prefix}member`;
const call = (userId, name, ...args) =>
  Meteor.server.method_handlers[name].apply({ userId, isSimulation: false }, args);

describe('messages', function () {
  let templateId;
  let membershipId;
  before(async function () {
    for (const [_id, role] of [[admin, 'admin'], [board, 'board']]) {
      await Meteor.users.removeAsync(_id);
      await Roles.createRoleAsync(role, { unlessExists: true });
      await Meteor.users.insertAsync({ _id, emails: [{ address: `${_id}@example.org` }] });
      await Roles.addUsersToRolesAsync(_id, role, null);
    }
    await Members.insertAsync({ _id: memberId, mid: 'M1', name: 'Msgtest Member', email: `${memberId}@example.org`, member: new Date(Date.now() + 5 * 86400000) });
    membershipId = await Memberships.insertAsync({ mid: memberId, amount: 200, start: new Date(), type: 'member', discount: false, family: false, memberend: new Date(Date.now() + 5 * 86400000) });
    templateId = await MessageTemplates.insertAsync({ name: `${prefix}welcome`, type: 'welcome', membertype: 'normal', membershiptype: 'member', subject: 'Hej <%= name %>', messagetext: 'Välkommen', deprecated: false, created: new Date(), modified: new Date() });
  });

  after(async function () {
    await Messages.removeAsync({ member: memberId });
    await MessageTemplates.removeAsync(templateId);
    await Memberships.removeAsync({ mid: memberId });
    await Members.removeAsync(memberId);
    await Meteor.roleAssignment.removeAsync({ 'user._id': { $regex: `^${prefix}` } });
    await Meteor.users.removeAsync({ _id: { $regex: `^${prefix}` } });
  });

  it('finds the template for a membership and writes the message from it', async function () {
    assert.strictEqual(await call(board, 'messages.membershipTemplate', memberId, membershipId, 'welcome'), templateId);
    await assert.rejects(call(board, 'messages.membershipTemplate', memberId, membershipId, 'confirmation'), /no-template/);
    const draft = await call(board, 'messages.compose', memberId, templateId, membershipId);
    assert.strictEqual(draft.subject, 'Hej Msgtest Member');
  });

  it('sends only as admin, and not without deliverMails', async function () {
    const message = { memberId, templateId, membershipId, to: `${memberId}@example.org`, subject: 's', messagetext: 't' };
    await assert.rejects(call(board, 'messages.send', message), /not-authorized/);
    await assert.rejects(call(admin, 'messages.send', message), /deliverMail/);
    assert.strictEqual(await Messages.find({ member: memberId }).countAsync(), 0);
  });

  it('marks the member reminded and not, and removes a message', async function () {
    await call(board, 'messages.setReminded', memberId, true);
    assert.ok((await Members.findOneAsync(memberId)).reminder);
    await call(board, 'messages.setReminded', memberId, false);
    assert.strictEqual((await Members.findOneAsync(memberId)).reminder, undefined);
    const docId = await Messages.insertAsync({ member: memberId, template: templateId, type: 'status', to: 'x@example.org', subject: 's', messagetext: 't', senddate: new Date() });
    await call(board, 'messages.remove', docId);
    assert.strictEqual(await Messages.findOneAsync(docId), undefined);
  });
});

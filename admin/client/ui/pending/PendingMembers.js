import { Template } from 'meteor/templating';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { Messages } from '/imports/common/collections/messages';
import { messageData, findBestTemplate } from '/imports/common/lib/message';
import { memberStatus } from '/imports/common/lib/utils';
import '../members/MemberStatus';
import './PendingMembers.html';

Template.PendingMembers.onCreated(function () {
  this.subscribe('members');
  this.subscribe('memberships');
  this.subscribe('users');
  this.subscribe('templates');
  this.subscribe('messages');
});

Template.PendingMembers.helpers({
  pendingMembers() {
    return Members.find(
      { registered: { $ne: true }, infamily: { $exists: false }, member: { $exists: true } },
      { sort: { name: 1 } }
    );
  },
  totalPaid(memberId) {
    const memberships = Memberships.find({ mid: memberId }).fetch();
    return memberships.reduce((sum, ms) => sum + (ms.amount || 0), 0);
  },
  linkedUser(email) {
    if (email) {
      return Meteor.users.findOne({ 'emails.address': email });
    }
  },
});

Template.PendingMembers.events({
  async 'click .acceptMember'(event) {
    const id = event.currentTarget.dataset.id;
    Members.update(id, { $set: { registered: true } });

    // Send automatic welcome message if a matching template exists
    const member = Members.findOne(id);
    if (!member) return;

    const status = await memberStatus(member);
    if (status.type === 'none') return;

    const membertype = member.family ? 'family' : (member.youth ? 'youth' : 'normal');
    const tpl = await findBestTemplate({
      auto: true, type: 'welcome', membershiptype: status.type, membertype
    });
    if (!tpl) return;

//    const latestMembership = Memberships.findOne({ mid: id }, { sort: { start: -1 } });
    try {
      const data = await messageData(id, tpl._id);
      await Meteor.callAsync('mail', data.to, data.subject, data.messagetext);
      Messages.insert({
        template: tpl._id,
        member: id,
//      membership: latestMembership?._id,
        type: 'welcome',
        to: data.to,
        subject: data.subject,
        senddate: new Date(),
        messagetext: data.messagetext,
      });
    } catch (err) {
      console.error('Failed to send welcome message:', err);
    }
  },
});

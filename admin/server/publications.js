import { Meteor } from 'meteor/meteor';
import { Members } from '/imports/common/collections/members';
import { Memberships } from '/imports/common/collections/memberships';
import { MessageTemplates } from '/imports/common/collections/templates';
import { Messages } from '/imports/common/collections/messages';
import { Payments } from '/imports/common/collections/payments';
import { Mails } from '/imports/common/collections/mails';
import { Comments } from '/imports/common/collections/comments';
import { Unlocks } from '/imports/common/collections/unlocks';
import { initiatedPayments } from '/imports/common/collections/initiatedPayments';

const createAuthFuncFor = (col) => async function () {
  if (
    this.userId &&
    (await Roles.userIsInRoleAsync(this.userId, 'admin'))
  ) return col.find();
  this.ready();
};

export default () => {
  Meteor.publish('members', createAuthFuncFor(Members));
  Meteor.publish('memberships', createAuthFuncFor(Memberships));
  Meteor.publish('templates', createAuthFuncFor(MessageTemplates));
  Meteor.publish('messages', createAuthFuncFor(Messages));
  Meteor.publish('mails', createAuthFuncFor(Mails));
  Meteor.publish('payments', createAuthFuncFor(Payments));
  Meteor.publish('comments', createAuthFuncFor(Comments));
  Meteor.publish('unlocks', createAuthFuncFor(Unlocks));
  Meteor.publish('users', createAuthFuncFor(Meteor.users));
  Meteor.publish(null, createAuthFuncFor(Meteor.roles));
  Meteor.publish('initiatedPayments', createAuthFuncFor(initiatedPayments));

  Meteor.publish(null, async function () {
    if (this.userId) {
      if ((await Roles.userIsInRoleAsync(this.userId, 'admin'))) return Meteor.roleAssignment.find();
      return Meteor.roleAssignment.find({ 'user._id': this.userId });
    }
    this.ready();
  });
};
import { Template } from 'meteor/templating';
import { Members } from '/collections/members';
import { Memberships } from '/collections/memberships';
import { Messages } from '/collections/messages';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import 'meteor/aldeed:autoform/static'

import '../comment/CommentList';
import './MemberView.html';
import './MemberStatus';
import '../message/MessageList';
import '../membership/MembershipList';
import '../family/FamilyList';
import '../message/ReminderMessage';

Template.MemberView.onCreated(function() {
  Meteor.subscribe('members');
  Meteor.subscribe('memberships');
  Meteor.subscribe('messages');
});

Template.MemberView.events({
  'click .deleteMember': function (event) {
    debugger;
    const mid = FlowRouter.getParam('_id');
    const infamily = Members.findOne({infamily: mid});
    if (infamily) {
      alert("Before you can remove this member you have to disconnect the the family members.");
      return;
    }

    if (confirm('Delete this user and all the associated memberships and messages')) {
      const member = Members.findOne(mid);
      Memberships.find({mid: mid}).forEach((ms) => {Memberships.remove(ms._id);});
      Messages.find({member: mid}).forEach((mes) => {Messages.remove(mes._id);});
      Members.remove(mid);
      FlowRouter.go('/members');
    }
  },
  'click .removeFromFamily': function (event) {
    if (confirm('Remove this user from its family, it will remain as an independent member that have to pay for itself.')) {
      const id = FlowRouter.getParam('_id');
      const member = Members.findOne(id);
      Members.update(id, {$unset: {infamily: ""}});
    }
  }
});

Template.MemberView.helpers({
  Members() {
    return Members;
  },
  id() {
    return FlowRouter.getParam('_id');
  },
  publicMemberPage() {
    const id = FlowRouter.getParam('_id');
    return (Meteor.settings.public.checkPath || "../check/") + id;
  },
  patron: function() {
    const mb = Members.findOne(FlowRouter.getParam('_id'));
    return mb && mb.family && !mb.infamily;
  },
  member: function() {
    return Members.findOne(FlowRouter.getParam('_id'));
  },
  payingMember: function() {
    const member = Members.findOne(FlowRouter.getParam('_id'));
    return Members.findOne(member.infamily);
  }
});
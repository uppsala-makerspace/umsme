import { Template } from 'meteor/templating';
import { Members } from '/collections/members';
import { Memberships } from '/collections/memberships';
import { Messages } from '/collections/messages';
import { memberStatus, updateMember } from '/lib/utils';
import './MemberView.html';
import '../message/MessageList';
import '../membership/MembershipList';
import '../family/FamilyList';
import '../message/ReminderMessage';

Template.MemberView.onCreated(function() {
  Meteor.subscribe('members');
  Meteor.subscribe('memberhips');
  Meteor.subscribe('messages');
});

Template.MemberView.events({
  'click .deleteMember': function (event) {
    const mid = FlowRouter.getParam('_id');
    const infamily = Members.findOne({infamily: mid});
    if (infamily) {
      alert("Before you can remove this member you have to disconnect the the family members.");
      return;
    }

    if (confirm('Delete this user and all the associated memberships and messages')) {
      const member = Members.findOne(mid);
//      Memberships.remove({mid: member._id});  // Only works in trusted mode (when signed in)
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
  },
  'click .updateMemberDates': function(event) {
    const mb = Members.findOne(FlowRouter.getParam('_id'));
    updateMember(mb);
  }
});

const te = (d1, d2) => {
  if (d1 && d2) {
    return d1.getTime() === d2.getTime();
  } else if (!d1 && !d2) {
    return true;
  }
  return false;
};

Template.MemberView.helpers({
  Members() {
    return Members;
  },
  id() {
    return FlowRouter.getParam('_id');
  },
  status() {
    const mb = Members.findOne(FlowRouter.getParam('_id'));
    const { member, lab, family } = memberStatus(mb);
    const now = new Date();
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate()+14);
    const familyNow = family > now;
    const labClass = lab > inTwoWeeks ? 'success' : (lab > now ? 'warning' : 'danger');
    const memberClass = member > inTwoWeeks ? 'success' : (member > now ? 'warning' : 'danger');
    return {
      inconsistent: !te(mb.member, member) || !te(mb.lab, lab) || (mb.family === true) !== familyNow,
      family: familyNow,
      familyPatron: mb.family && !mb.infamily,
      lab: mb.lab,
      labClass,
      member: mb.member,
      memberClass
    };
  },
  member: function() {
    return Members.findOne(FlowRouter.getParam('_id'));
  },
  payingMember: function() {
    const member = Members.findOne(FlowRouter.getParam('_id'));
    return Members.findOne(member.infamily);
  },
  memberLastDate: function () {
    const member = Members.findOne(FlowRouter.getParam('_id'));
    return moment(member.member).format("YYYY-MM-DD");
  },
  labMemberLastDate: function () {
    const member = Members.findOne(FlowRouter.getParam('_id'));
    return moment(member.lab).format("YYYY-MM-DD");
  }
});
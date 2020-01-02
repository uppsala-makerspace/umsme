import { Template } from 'meteor/templating';
import { Members } from '../../../collections/members.js';
import { Memberships } from '../../../collections/memberships.js';
import './MemberView.html';
import '../membership/MembershipList';
import '../family/FamilyList';

Template.MemberView.onCreated(function() {
  const self = this;
  self.autorun(function() {
    self.subscribe('members');
  });
});

Template.MemberView.events({
  'click .deleteMember': function (event) {
    const mid = FlowRouter.getParam('_id');
    const infamily = Members.findOne({infamily: mid});
    if (infamily) {
      alert("Before you can remove this member you have to disconnect the the family members.");
      return;
    }

    if (confirm('Delete this user and all the associated memberships')) {
      const member = Members.findOne(mid);
//      Memberships.remove({mid: member._id});  // Only works in trusted mode (when signed in)
      Memberships.find({mid: mid}).forEach((ms) => {Memberships.remove(ms._id);});
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
    const id = FlowRouter.getParam('_id');
    const mb = Members.findOne(id);
    const { member, lab, family } = dates(mb);
    const familyNow = family > new Date();
    const $set = { family: familyNow};
    const $unset = {};
    if (member) {
      $set.member = member;
    } else {
      $unset.member = "";
    }
    if (lab) {
      $set.lab = lab;
    } else {
      $unset.lab = "";
    }
    Members.update(id, {$set, $unset});
  }
});

const dates = (mb) => {
  const mid = mb.infamily || mb._id;
  let member;
  let lab;
  let family;
  const updateMemberEndDate = (ms) => {
    if (!member || ms.end > member) {
      member = ms.end;
    }
  };
  const updateLabEndDate = (ms) => {
    if (!lab || ms.end > lab) {
      lab = ms.end;
    }
  };
  Memberships.find({mid}).forEach((ms) => {
    switch (ms.type) {
      case 'member':
        updateMemberEndDate(ms);
        break;
      case 'lab':
        updateLabEndDate(ms);
        break;
      case 'labandmember':
        updateMemberEndDate(ms);
        updateLabEndDate(ms);
        break;
    }
    if (ms.family && (!family || ms.end > family)) {
      family = ms.end;
    }
  });
  return { member, lab, family};
};

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
    const { member, lab, family } = dates(mb);
    const now = new Date();
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate()+14);
    const familyNow = family > now;
    const labClass = lab > inTwoWeeks ? 'success' : (lab > now ? 'warning' : 'danger');
    const memberClass = member > inTwoWeeks ? 'success' : (member > now ? 'warning' : 'danger');
    return {
      inconsistent: !te(mb.member, member) || !te(mb.lab, lab) || (mb.family === true) !== familyNow,
      family: familyNow,
      familyPatron: familyNow && !mb.infamily,
      lab: mb.lab,
      labClass,
      member: mb.member,
      memberClass
    };
  },
  member: function() {
    const member = Members.findOne(FlowRouter.getParam('_id'));
    return member;
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
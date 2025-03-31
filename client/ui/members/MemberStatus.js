import { Template } from 'meteor/templating';
import { Members } from '/collections/members';
import { memberStatus, updateMember } from '/lib/utils';
import { reminderDays, reminderState } from '/lib/rules';
import moment from 'moment';
import './MemberStatus.html';

Template.MemberStatus.onCreated(function() {
  Meteor.subscribe('members');
});

Template.MemberStatus.events({
  'click .updateMemberDates': function(event) {
    const mb = Members.findOne(this.member);
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

Template.MemberStatus.helpers({
  status() {
    const mb = Members.findOne(this.member);
    if (!mb) {
      return {};
    }
    const { member, lab, family } = memberStatus(mb);
    const now = new Date();
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate()+reminderDays);
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
  reminder: function() {
    const obj = Members.findOne(this.member);
    if (!obj) {
      return {};
    }
    const {state, date, formatted} = reminderState(obj);
    let cls = '';
    let text = '';
    switch (state) {
      case 'done':
        cls = 'success';
        text = `Reminder sent: ${formatted}`;
        break;
      case 'needed':
        cls = 'danger';
        text = 'Reminder needed';
        break;
      case 'old':
        cls = 'default';
        text = `Reminder sent: ${formatted}`;
        break;
    }
    return {
      visible: !obj.infamily && this.state !== 'none',
      text,
      cls,
    };
  },
  memberLastDate: function () {
    const member = Members.findOne(this.member);
    return moment(member.member).format("YYYY-MM-DD");
  },
  labMemberLastDate: function () {
    const member = Members.findOne(this.member);
    return moment(member.lab).format("YYYY-MM-DD");
  }
});
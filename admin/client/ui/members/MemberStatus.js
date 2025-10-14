import { Template } from 'meteor/templating';
import { Members } from '/imports/common/collections/members';
import { memberStatus, updateMember } from '/imports/common/lib/utils';
import { reminderDays, reminderState } from '/imports/common/lib/rules';
import moment from 'moment';
import './MemberStatus.html';

Template.MemberStatus.onCreated(function() {
  this.autorun(() => {
    this.subscribe('members');
    this.subscribe('memberships'); // Needed for memberStatus
  });
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
  async statusAsync() {
    // Tracker computation is lost after first await
    const computation = Tracker.currentComputation;
    const mb = await Members.findOneAsync(this.member);
    if (!mb) {
      return {};
    }

    // Bring back reactivity to the async call memberStatus (lost due to the await above).
    const { memberEnd, labEnd, family } = await Tracker.withComputation(computation, () => memberStatus(mb));
    const now = new Date();
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate()+reminderDays);
    const labClass = labEnd > inTwoWeeks ? 'success' : (labEnd > now ? 'warning' : 'danger');
    const memberClass = memberEnd > inTwoWeeks ? 'success' : (memberEnd > now ? 'warning' : 'danger');
    return {
      inconsistent: !te(mb.member, memberEnd) || !te(mb.lab, labEnd) || (mb.family === true) !== family,
      family,
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
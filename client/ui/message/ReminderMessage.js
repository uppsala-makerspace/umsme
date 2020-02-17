import { Template } from 'meteor/templating';
import { Members } from '/collections/members';
import { MessageTemplates } from '/collections/templates';
import { memberStatus } from '/lib/utils';
import './ReminderMessage.html';
import { reminderDays } from '/lib/rules';


Template.ReminderMessage.onCreated(function() {
  Meteor.subscribe('templates');
  Meteor.subscribe('members');
});

Template.ReminderMessage.events({
  'click .reminderButton':  function (event) {
    event.preventDefault();
    const mb = Members.findOne(this.member);
    const { member, lab, family } = memberStatus(mb);
    const membertype = mb.family === true ? 'family' : (mb.youth === true ? 'youth' : 'normal');
    const now = new Date();
    const inTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate()+reminderDays);
    const labNow = lab > now;
    const memberNow = member > now;
    if (lab < inTwoWeeks || member < inTwoWeeks) {
      const membershiptype = member < inTwoWeeks && lab < inTwoWeeks ? 'labandmember' : (member < inTwoWeeks ? 'member' : 'lab');
      let template = MessageTemplates.findOne({ type: 'reminder', membertype, membershiptype, deprecated: false });
      if (!template) {
        template = MessageTemplates.findOne({ type: 'reminder', membershiptype, deprecated: false });
      }
      if (template) {
        FlowRouter.go(`/message/send?member=${this.member}&template=${template._id}`);
      } else {
        alert(`No non-deprecated template of type "reminder" with member type "${membertype}" and membership type "${membershiptype}" found.`);
      }
    } else {
      alert('Neither lab or regular membership is due in the next two weeks, no need to send reminder.');
    }
  }
});
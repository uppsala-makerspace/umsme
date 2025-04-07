import { Template } from 'meteor/templating';
import { Members } from '/collections/members';
import { MessageTemplates } from '/collections/templates';
import { memberStatus } from '/lib/utils';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './ReminderMessage.html';
import { reminderDays } from '/lib/rules';

Template.ReminderMessage.onCreated(function() {
  Meteor.subscribe('templates');
  Meteor.subscribe('members');
});

Template.ReminderMessage.events({
  'click .reminderDoneButton':  function (event) {
    Members.update(this.member, { $set: { reminder: new Date() } });
  },
  'click .reminderNeededButton':  function (event) {
    Members.update(this.member, { $unset: { reminder: null } });
  },
  'click .reminderButton':  async function (event) {
    event.preventDefault();
    const mb = await Members.findOneAsync(this.member);
    const { member, lab, family } = await memberStatus(mb);
    const membertype = mb.family === true ? 'family' : (mb.youth === true ? 'youth' : 'normal');
    const now = new Date();
    const inTwoWeeks = new Date();
    const lastTwoWeeks = new Date();
    inTwoWeeks.setDate(inTwoWeeks.getDate()+reminderDays);
    lastTwoWeeks.setDate(lastTwoWeeks.getDate()-reminderDays);
    const labReminder = lab < inTwoWeeks && lab > lastTwoWeeks;
    const memberReminder = member < inTwoWeeks && member > lastTwoWeeks;
    if (labReminder || memberReminder) {
      const membershiptype = labReminder && memberReminder ? 'labandmember' : (memberReminder ? 'member' : 'lab');
      let template = await MessageTemplates.findOneAsync({ type: 'reminder', membertype, membershiptype, deprecated: false });
      if (!template) {
        template = await MessageTemplates.findOneAsync({ type: 'reminder', membershiptype, deprecated: false });
      }
      if (template) {
        FlowRouter.go(`/admin/message/send?member=${this.member}&template=${template._id}`);
      } else {
        alert(`No non-deprecated template of type "reminder" with member type "${membertype}" and membership type "${membershiptype}" found.`);
      }
    } else {
      alert('Neither lab or regular membership is due in the next two weeks, no need to send reminder.');
    }
  }
});
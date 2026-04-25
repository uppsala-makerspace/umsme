import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { overdueReminderDays, reminderDays } from '/imports/common/lib/rules';
import '/imports/tabular/members';
import './Reminders.html';

Template.Reminders.onCreated(function () {
  this.subscribe('members');
});

Template.Reminders.helpers({
  selector() {
    const intervalStart = new Date();
    intervalStart.setDate(intervalStart.getDate() - overdueReminderDays);
    const intervalEnd = new Date();
    intervalEnd.setDate(intervalEnd.getDate() + reminderDays);
    return {
      infamily: { $exists: false },
      $or: [
        { member: { $gt: intervalStart, $lt: intervalEnd } },
        { lab:    { $gt: intervalStart, $lt: intervalEnd } },
      ],
    };
  },
});

Template.Reminders.events({
  'click .memberList tbody tr'(event) {
    if (event.target.nodeName !== 'A') {
      event.preventDefault();
      const dataTable = $(event.target).closest('table').DataTable();
      const rowData = dataTable.row(event.currentTarget).data();
      if (!rowData) return;
      FlowRouter.go(`/member/${rowData._id}`);
    }
  },
  async 'click .runReminderJob'(event) {
    const button = event.currentTarget;
    if (!confirm("Run the reminder job now? Mails will be sent to anyone in the 14-day window who hasn't already received this reminder.")) return;
    button.disabled = true;
    try {
      const result = await Meteor.callAsync('reminders.runNow');
      alert(result);
    } catch (err) {
      alert(`Failed: ${err.reason || err.message}`);
    } finally {
      button.disabled = false;
    }
  },
});

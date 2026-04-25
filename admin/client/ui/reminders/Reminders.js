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
});

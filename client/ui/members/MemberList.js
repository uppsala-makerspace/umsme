import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Members } from '../../../collections/members.js';
import { ReactiveDict } from 'meteor/reactive-dict';
import './MemberList.html';
import '../../../lib/tabular/members';
import { overdueReminderDays, reminderDays }  from '../../../lib/rules';

Template.MemberList.onCreated(function() {
  Meteor.subscribe('members');
  this.state = new ReactiveDict();
  this.state.set('reminders', false);
});

Template.MemberList.helpers({
  selector() {
    const reminders = Template.instance().state.get('reminders');
    if (reminders) {
      const intervalStart = new Date();
      intervalStart.setDate(intervalStart.getDate() - overdueReminderDays);
      const intervalEnd = new Date();
      intervalEnd.setDate(intervalEnd.getDate() + reminderDays);
      return {
        $or: [
          {$and: [
              {member: {$gt: intervalStart}},
              {member: {$lt: intervalEnd}},
              {infamily: {$exists: false}}
            ]
          },
          {$and: [
              {lab: {$gt: intervalStart}},
              {lab: {$lt: intervalEnd}},
              {infamily: {$exists: false}}
            ]
          }
        ]
      };
    }
    return {};
  }
});

const forceDownload = (rows, filename) => {
  const csvContent = "data:text/csv;charset=utf-8,"
    + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link); // Required for FF
  link.click(); // This will download the data file named "my_data.csv".
  link.remove();
};

const toDate = d => (d ? d.toISOString().substr(0, 10) : '');

Template.MemberList.events({
  'click .memberList tbody tr': function (event) {
    if (event.target.nodeName !== 'A') {
      event.preventDefault();
      const dataTable = $(event.target).closest('table').DataTable();
      const rowData = dataTable.row(event.currentTarget).data();
      if (!rowData) return; // Won't be data if a placeholder row is clicked
      FlowRouter.go(`/member/${rowData._id}`);
    }
  },
  'click .downloadCurrent': function () {
    const today = new Date();
    const current = Members.find({
      'member': {
        $gte: today
      }
    }).fetch();
    const rows = current.map((m) => ([
      m.name,
      m.email,
      `${m.lab > today}`,
      `${m.family}`,
      `${!m.infamily}`,
    ]));
    rows.unshift(['Name', 'Email', 'Lab', 'Family', 'Paying member']);

    forceDownload(rows, 'active_members.csv');
  },
  'click .filterReminders': function (event, instance) {
    instance.state.set('reminders', event.target.checked );
  },

  'click .downloadAll': function () {
    const today = new Date();
    const current = Members.find({}).fetch();
    const rows = current.map((m) => ([
      m.mid,
      m.name,
      m.email,
      `${toDate(m.member)}`,
      `${toDate(m.lab)}`,
      `${m.family}`,
      `${!m.infamily}`,
    ]));
    rows.unshift(['Id', 'Name', 'Email', 'Member to', 'Labbmember to', 'Family', 'Paying member']);

    forceDownload(rows, 'all_members.csv');
  }
});
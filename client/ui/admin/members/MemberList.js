import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Members } from '/collections/members';
import './MemberList.html';
import '/lib/tabular/members';

Template.MemberList.onCreated(() => {
  Meteor.subscribe('members');
  Meteor.subscribe('users');
});

Template.MemberList.helpers({
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
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return; // Won't be data if a placeholder row is clicked
    FlowRouter.go(`/admin/member/${rowData._id}`);
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
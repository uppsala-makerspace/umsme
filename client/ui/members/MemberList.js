import { Template } from 'meteor/templating';
import { Members } from '../../../collections/members.js';
import { models } from '../../../lib/models';
import { fields } from '../../../lib/fields';
import './MemberList.html';

Template.MemberList.onCreated(() => {
  Meteor.subscribe('members');
});

Template.MemberList.helpers({
  settings: {
    collection: Members,
    rowsPerPage: 10,
    showFilter: true,
//    multiColumnSort: false,
    fields: fields.member(),
    class: "table table-bordered table-hover",
  }
});

const forceDownload = (rows, filename) => {
  let csvContent = "data:text/csv;charset=utf-8,"
    + rows.map(e => e.join(",")).join("\n");

  var encodedUri = encodeURI(csvContent);
  var link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link); // Required for FF
  link.click(); // This will download the data file named "my_data.csv".
  link.remove();
};

const toDate = d => (d ? d.toISOString().substr(0, 10) : '');

Template.MemberList.events({
  'click .reactive-table tbody tr': function (event) {
    event.preventDefault();
    var post = this;
    FlowRouter.go(`/member/${post._id}`);
    //window.location.href = "/member/"
    //console.log(post.mid);
    // checks if the actual clicked element has the class `delete`
/*    if (event.target.className == "delete") {
      Posts.remove(post._id)
    }*/
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
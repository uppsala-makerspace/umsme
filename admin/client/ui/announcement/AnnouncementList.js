import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './AnnouncementList.html';
import '/imports/tabular/announcements';

Template.AnnouncementList.onCreated(function() {
  Meteor.subscribe('announcements');
});

Template.AnnouncementList.events({
  'click .announcementList tbody tr': function (event) {
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return;
    FlowRouter.go(`/announcement/${rowData._id}`);
  }
});

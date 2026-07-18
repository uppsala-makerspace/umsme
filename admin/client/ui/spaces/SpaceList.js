import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '/imports/tabular/spaces';

import './SpaceList.html';

Template.SpaceList.onCreated(function () {
  Meteor.subscribe('spaces');
  this.importResult = new ReactiveVar(null);
});

Template.SpaceList.helpers({
  importResult() {
    return Template.instance().importResult.get();
  },
});

Template.SpaceList.events({
  'click .importSpaces': function (event, template) {
    event.preventDefault();
    Meteor.call('adminSpaces.importFromRooms', (err, res) => {
      if (err) {
        alert('Import failed: ' + err.message);
        return;
      }
      template.importResult.set(res);
    });
  },
  'click .spaceList tbody tr': function (event) {
    event.preventDefault();
    const dataTable = $(event.target).closest('table').DataTable();
    const rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return;
    FlowRouter.go(`/space/${rowData._id}`);
  },
});

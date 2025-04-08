import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import '/lib/tabular/members';
import './FamilyList.html';

Template.FamilyList.onCreated(function() {
  Meteor.subscribe('members');
});

Template.FamilyList.helpers({
  selector() {
    return {infamily: this.patron};
  }
});

Template.FamilyList.events({
  'click .familyList tbody tr': function (event) {
    event.preventDefault();
    var dataTable = $(event.target).closest('table').DataTable();
    var rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return; // Won't be data if a placeholder row is clicked
    FlowRouter.go(`/admin/member/${rowData._id}`);
  }
});
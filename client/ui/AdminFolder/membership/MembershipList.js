import { Template } from 'meteor/templating';
import { Memberships } from '../../../collections/memberships.js';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { fields } from '../../../lib/fields';
import './MembershipList.html';
import '../../../lib/tabular/memberships';

Template.MembershipList.onCreated(function() {
  Meteor.subscribe('memberships');
});

Template.MembershipList.helpers({
  selector() {
    return {mid: this.member};
  },

  settings() {
    return {
      collection: Memberships.find({mid: this.member}),
      rowsPerPage: 10,
      showFilter: false,
      fields: fields.membership(),
      showNavigation: 'auto',
      class: "table table-bordered table-hover",
    }
  }
});

Template.MembershipList.events({
  'click .membershipList tbody tr': function (event) {
    event.preventDefault();
    var dataTable = $(event.target).closest('table').DataTable();
    var rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return; // Won't be data if a placeholder row is clicked
    FlowRouter.go(`/membership/${rowData._id}`);
  }
});
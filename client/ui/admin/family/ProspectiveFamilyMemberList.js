import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Members } from '/collections/members.js';
import { updateMember } from '/lib/utils';
import './ProspectiveFamilyMemberList.html';

Template.ProspectiveFamilyMemberList.onCreated(function() {
  Meteor.subscribe('members');
});

Template.ProspectiveFamilyMemberList.helpers({
  selector() {
    return {$and: [{infamily: {$exists: false}}, {family: {$eq: false}}]};
  },
  id() {
    return FlowRouter.getParam('_id');
  },
});

Template.ProspectiveFamilyMemberList.events({
  'click .familyList tbody tr': function (event) {
    event.preventDefault();
    // The family patron
    const patronId = FlowRouter.getParam('_id');

    // Find the clicked upon member that will be added
    var dataTable = $(event.target).closest('table').DataTable();
    var rowData = dataTable.row(event.currentTarget).data();
    if (!rowData) return; // Won't be data if a placeholder row is clicked
    const memberId = rowData._id;

    // Update the member to add it to the patrons family
    Members.update(memberId, {$set: {infamily: patronId}});
    const mb = Members.findOne(memberId);
    updateMember(mb);

    // Go back to the patron of the family
    FlowRouter.go(`/admin/member/${patronId}`);
  }
});
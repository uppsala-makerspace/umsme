import { Template } from 'meteor/templating';
import { Members } from '../../../collections/members.js';
import { fields } from '../../../lib/fields';
import './ProspectiveFamilyMemberList.html';

Template.ProspectiveFamilyMemberList.helpers({
  settings: {
    collection: Members.find({$and: [{infamily: {$exists: false}}, {family: {$eq: false}}]}),
    rowsPerPage: 10,
    showFilter: true,
    fields: fields.member,
    class: "table table-bordered table-hover",
  }
});

Template.ProspectiveFamilyMemberList.events({
  'click .reactive-table tbody tr': function (event) {
    event.preventDefault();
    var memberId = this._id;
    const patronId = FlowRouter.getParam('_id');
    Members.update(memberId, {$set: {infamily: patronId}});
    FlowRouter.go(`/member/${patronId}`);
  }
});
import { Template } from 'meteor/templating';
import { Members } from '../../../collections/members.js';
import { fields } from '../../../lib/fields';
import './FamilyList.html';

Template.FamilyList.helpers({
  settings() {
    return {
      collection: Members.find({infamily: this.patron}),
      rowsPerPage: 10,
      showFilter: false,
      fields: fields.member(),
      showNavigation: 'auto',
      class: "table table-bordered table-hover",
    }
  }
});

Template.FamilyList.events({
  'click .reactive-table tbody tr': function (event) {
    event.preventDefault();
    FlowRouter.go(`/member/${this._id}`);
  }
});
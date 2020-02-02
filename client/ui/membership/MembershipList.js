import { Template } from 'meteor/templating';
import { Memberships } from '../../../collections/memberships.js';
import { Members } from '../../../collections/members.js';
import { fields } from '../../../lib/fields';
import './MembershipList.html';

Template.MembershipList.helpers({
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
  'click .reactive-table tbody tr': function (event) {
    event.preventDefault();
    FlowRouter.go(`/membership/${this._id}`);
  }
});
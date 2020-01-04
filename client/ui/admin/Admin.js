import { Template } from 'meteor/templating';
import './Admin.html';

Template.AdminConsole.helpers({
});

Template.AdminConsole.events({
  'click .importData': function (event) {
    if (confirm('Import data from CSV file now?')) {
      Meteor.call('importData');
    }
  },
  'click .updateMembers': function (event) {
    if (confirm('Update dates from membership information?')) {
      Meteor.call('updateMembers');
    }
  }
});
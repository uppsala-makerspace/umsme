import { Template } from 'meteor/templating';
import './DoorUnlocksList.html';
import '/imports/tabular/doorUnlocks';

Template.DoorUnlocksList.onCreated(function () {
  this.subscribe('members');
  this.subscribe('doorunlocks');
});

Template.DoorUnlocksList.events({
  'change .toggleNames': function (event) {
    const checked = event.target.checked;
    const table = $('.doorUnlocksTable').DataTable();
    table.column('memberName:name').visible(checked);
  },
});

import { Template } from 'meteor/templating';
import './DoorUnlocksList.html';
import '/imports/tabular/doorUnlocks';

Template.DoorUnlocksList.onCreated(function () {
  this.subscribe('members');
  this.subscribe('doorunlocks');
});

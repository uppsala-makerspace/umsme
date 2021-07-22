import {Meteor} from "meteor/meteor";

Meteor.methods({
  'settings': () => {
    return Meteor.settings.public || {};
  }
});

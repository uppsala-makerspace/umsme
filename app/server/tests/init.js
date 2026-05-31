import { Meteor } from 'meteor/meteor';
import { loadAllTests } from '/imports/common/server/tests/loader';

const HOUR_MS = 60 * 60 * 1000;

Meteor.startup(() => {
  loadAllTests();
  Meteor.setInterval(loadAllTests, HOUR_MS);
});

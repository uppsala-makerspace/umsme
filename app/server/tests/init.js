import { Meteor } from 'meteor/meteor';
import { loadAllTests } from '/imports/common/server/tests/loader';

const HOUR_MS = 60 * 60 * 1000;

const msUntilNextFivePastHour = () => {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(5, 0, 0);
  if (next <= now) next.setHours(next.getHours() + 1);
  return next - now;
};

Meteor.startup(() => {
  loadAllTests();
  Meteor.setTimeout(() => {
    loadAllTests();
    Meteor.setInterval(loadAllTests, HOUR_MS);
  }, msUntilNextFivePastHour());
});

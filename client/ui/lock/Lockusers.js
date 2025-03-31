import { Session } from 'meteor/session';
import './Lockusers.html';
import { getMemberLockDates } from './utils';

Template.Lockusers.onCreated(function() {
  Meteor.subscribe('members');
  Session.set('lockIncludeFilter', {
    wrong: true,
    stale: true
  });
  Session.set('lockusers', []);
});

Template.Lockusers.helpers({
  lockusers() {
    const include = Session.get('lockIncludeFilter');
    const lockusers = Session.get('lockusers');
    const filteredlockusers = lockusers.filter((row) => {
      return include[row.lockstatus] === true;
    });
    return filteredlockusers;
  }
});

Template.Lockusers.events({
  'click .syncWithLock': async function (event, instance) {
    try {
      instance.lockdata = await Meteor.callAsync('lockStatus');
      const lockusers = await getMemberLockDates(instance.lockdata);
      Session.set('lockusers', lockusers);
    } catch(err) {
      console.log(err);
    }
  },
  'click .fixButton': async function (event, instance) {
    event.preventDefault();
    var data = $(event.target).closest('tr').data();
    if (!data || !data.memberid) return; // Won't be data if a placeholder row is clicked
    const lockusers = Session.get('lockusers');
    const lockuser = lockusers.find(r => r.member === data.memberid);
    delete lockuser.fix;
    lockuser.lockstatus = 'stale';
    Session.set('lockusers', lockusers.slice(0));

    // Update Danalock
    const link = instance.lockdata.links.find(link => link.user_id === lockuser.lockid);
    if (link) {
      const cal = instance.lockdata.calendars.find(cal => cal.id === link.calendar_id);
      await Meteor.callAsync('setCalenderEndDate', cal, new Date(lockuser.labdate).toISOString(), link);
    } else {
      await Meteor.callAsync('createCalendarEndDate', lockuser.lockid, new Date(lockuser.labdate).toISOString());
    }
  },
});

Template.FilterCheck.helpers({
  checked() {
    const include = Session.get('lockIncludeFilter');
    return include[this.name] ? 'checked' : '';
  }
});

Template.FilterCheck.events({
  'change .checkInput': function (event, instance) {
    const include = Object.assign({}, Session.get('lockIncludeFilter'));
    if (event.target.checked) {
      include[this.name] = true;
    } else {
      delete include[this.name];
    }
    Session.set('lockIncludeFilter', include);
  }
});
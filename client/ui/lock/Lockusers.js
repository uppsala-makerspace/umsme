import './Lockusers.html';
import { updateCollection} from './utils';
import { ReactiveDict } from 'meteor/reactive-dict';
import { fields } from '/lib/fields';
import { schemas} from '/lib/schemas';
import { Members} from '/collections/members';
import { Session } from 'meteor/session';

Template.Lockusers.onCreated(function() {
  Meteor.subscribe('members');
  this.state = new ReactiveDict();
  this.state.set('initialized', false);
});

Template.Lockusers.helpers({
  initialized() {
    return Template.instance().state.get('initialized');
  },
  lockusers() {
    return Template.instance().collection;
  },
  settings() {
    const instance = Template.instance();
    return {
      collection: instance.collection,
      rowsPerPage: 10,
      showFilter: true,
      fields: fields.lockusers(),
      class: "table table-bordered table-hover",
      filters: ['noaccount', 'invited', 'wrong', 'correct', 'forever', 'admin', 'old'],
      filterOperator: '$or'
    };
  },
  selected() {
    const member = Template.instance().state.get('selected');
    if (member && member != '') {
      return Template.instance().collection.findOne({member});
    }
  },
  canSetEndDate() {
    const member = Template.instance().state.get('selected');
    if (member && member != '') {
      const lockuser = Template.instance().collection.findOne({member});
      return lockuser && (lockuser.lockstatus === 'wrong' || lockuser.lockstatus === 'forever');
    }
  },
  canCreateAccount() {
    const member = Template.instance().state.get('selected');
    if (member && member != '') {
      const lockuser = Template.instance().collection.findOne({member});
      return lockuser && (lockuser.lockstatus === 'noaccount');
    }
  }
});

Template.Lockusers.events({
  'click .syncWithLock': function (event, instance) {
    const lockusers =  new Mongo.Collection(null);
    lockusers.attachSchema(schemas.lockusers);
    instance.collection = lockusers;
    Meteor.call('lockStatus', (err, res) => {
      instance.lockdata = res;
      updateCollection(lockusers, res);
      instance.state.set('initialized', true);
    });
  },
  'click .reactive-table tbody tr': function (event, instance) {
    event.preventDefault();
    instance.state.set('selected', this.member);
  },
  'click .backToSearch': function (event, instance) {
    event.preventDefault();
    instance.state.set('selected', '');
  },
  'click .setEndDate': function (event, instance) {
    event.preventDefault();
    const member = instance.state.get('selected');
    const lockuser = instance.collection.findOne({member});
    const link = instance.lockdata.links.find(link => link.user_id === lockuser.lockid);
    if (link) {
      const cal = instance.lockdata.calendars.find(cal => cal.id === link.calendar_id);
      Meteor.call('setCalenderEndDate', cal, lockuser.labdate.toISOString(), link, function(event, instance) {
        // refresh
      });
    } else {
      Meteor.call('createCalendarEndDate', lockuser.lockid, lockuser.labdate.toISOString(), function(event, instance) {
        // refresh
      });
    }
  },
  'click .createAccount': function (event, instance) {
    event.preventDefault();
    alert("hopp");
  },
    /*  'click .signinbank': function(event, instance) {
        Meteor.call('initiateBank', (err, res) => {
          if (err) {
            instance.state.set('status', 'error: ' + err.error);
          } else {
            instance.state.set('status', res.status);
          }
        });
      },*/
});

Template.FilterCheck.created = function () {
  this.filter = new ReactiveTable.Filter(this.data.name, ['lockstatus']);
  const checked = Session.get("filterCheck"+this.data.name);
  if (this.data.checked) {
    this.filter.set(this.data.name)
  } else {
    this.filter.set('bad');
  }
};

Template.FilterCheck.events({
  'change .checkInput': function (event, instance) {
    if (event.target.checked) {
      instance.filter.set(instance.data.name);
    } else {
      instance.filter.set('bad');
    }
  }
});
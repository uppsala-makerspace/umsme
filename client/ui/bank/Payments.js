import { Payments } from '/collections/payments';
import './Payments.html';
import { ReactiveDict } from 'meteor/reactive-dict';
import { fields } from '../../../lib/fields';

Template.Payments.onCreated(function() {
  Meteor.subscribe('payments');
  this.state = new ReactiveDict();
  this.state.set('status', 'unknown');
});

Template.Payments.helpers({
  status() {
    const state = Template.instance().state;
    return state.get('status');
  },
  enablesignin() {
    const status = Template.instance().state.get('status');
    return status === 'uninitiated';
  },
  enablesignout() {
    const status = Template.instance().state.get('status');
    return status === 'ready';
  },
  transactions() {
    return Template.instance().state.get('transactions');
  },
  pnr() {
    return (Meteor.user().profile || {}).pnr;
  },
  settings: {
    collection: Payments,
    rowsPerPage: 10,
    showFilter: true,
    fields: fields.payment(),
    class: "table table-bordered table-hover",
  }
});

Template.Payments.events({
  'click .checkBank': function (event, instance) {
    Meteor.call('checkBank', (err, res) => {
      if (err) {
        instance.state.set('status', 'error: ' + err.error);
      } else {
        instance.state.set('status', res.status);
      }
    });
  },
  'click .signinbank': function(event, instance) {
    Meteor.call('initiateBank', (err, res) => {
      if (err) {
        instance.state.set('status', 'error: ' + err.error);
      } else {
        instance.state.set('status', res.status);
      }
    });
  },
  'click .signoutbank': function(event, instance) {
    Meteor.call('clearSession', (err, res) => {
      if (err) {
        instance.state.set('status', 'error: ' + err.error);
      } else {
        instance.state.set('status', res.status);
      }
    });
  },
  'click .synchronize': function(event, instance) {
    Meteor.call('synchronize', (err, res) => {
      if (err) {
        instance.state.set('status', 'error: ' + err.error);
      } else {

      }
    });
  },
  'submit .personalnumber': function (event, instance) {
    event.preventDefault();
    const pnr = event.target.pnr.value;
    Meteor.call('setPnr', pnr);
  },
  'click .reactive-table tbody tr': function (event) {
    event.preventDefault();
    FlowRouter.go(`/payment/${this._id}`);
  }
});
import { Payments } from '/collections/payments';
import './Payments.html';
import { ReactiveDict } from 'meteor/reactive-dict';
import { fields } from '../../../lib/fields';

Template.Payments.onCreated(function() {
  Meteor.subscribe('payments');
  this.state = new ReactiveDict();
  this.state.set('status', 'unknown');
  this.state.set('image', 'unknown');
  Meteor.call('checkBank', (err, res) => {
    if (err) {
      this.state.set('status', 'error: ' + err.error);
    } else {
      this.state.set('status', res.status);
    }
  });
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
  qr() {
    return Template.instance().state.get('status') === 'waiting';
  },
  image() {
    let str = Template.instance().state.get('image');
    console.log('Image is: '+str);
    return `data:image/png;base64,${str}`;
  },
  pnr() {
    return (Meteor.user().profile || {}).pnr;
  },
  settings: {
    collection: Payments,
    rowsPerPage: 50,
    showFilter: true,
    fields: fields.payment(),
    class: "table table-bordered table-hover",
  }
});

const check = (state) => {
  Meteor.call('checkBank', (err, res) => {
    if (err) {
      state.set('status', 'error: ' + err.error);
    } else {
      state.set('status', res.status);
    }
  });
}

Template.Payments.events({
  'click .checkBank': function (event, instance) {
    check(instance.state);
  },
  'click .signinbank': function(event, instance) {
    Meteor.call('initiateBank', (err, res) => {
      if (err) {
        instance.state.set('status', 'error: ' + err.error);
      } else {
        instance.state.set('status', 'waiting');
        instance.state.set('image', res);
        let counter = 20;
        let countdown = setInterval(() => {
          check(instance.state);
          counter -= 1;
          if (counter < 0 || instance.state.get('status') !== 'waiting') {
            clearTimeout(countdown);
          }
        }, 2000);
      }
    });
  },
  'click .signoutbank': function(event, instance) {
    Meteor.call('clearSession', (err, res) => {
      if (err) {
        instance.state.set('status', 'error: ' + err.error);
      } else {
        instance.state.set('status', 'uninitiated');
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
    if (event.target.nodeName !== 'A') {
      event.preventDefault();
      FlowRouter.go(`/payment/${this._id}`);
    }
  }
});
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './Payments.html';
import { ReactiveDict } from 'meteor/reactive-dict';
import '/lib/tabular/payments';


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
  'click .signinbank': async function(event, instance) {
    try {
      const res = await Meteor.callAsync('initiateBank');
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
    } catch(err) {
      instance.state.set('status', 'error: ' + err); // err.error
    }
  },
  'click .signoutbank': async function(event, instance) {
    try {
      const res = await Meteor.callAsync('clearSession');
      instance.state.set('status', 'uninitiated');
    } catch(err) {
      instance.state.set('status', 'error: ' + err.error);
    }
  },
  'click .synchronize': async function(event, instance) {
    try {
      await Meteor.callAsync('synchronize');
      // Nothing to do, effect of this call is that Payments collection is updated
    } catch(err) {
      instance.state.set('status', 'error: ' + err.error);
    }
  },
  'submit .personalnumber': function (event, instance) {
    event.preventDefault();
    const pnr = event.target.pnr.value;
    Meteor.callAsync('setPnr', pnr);
  },
  'click .paymentList tbody tr': function (event) {
    if (event.target.nodeName !== 'A') {
      event.preventDefault();
      const dataTable = $(event.target).closest('table').DataTable();
      const rowData = dataTable.row(event.currentTarget).data();
      if (!rowData) return; // Won't be data if a placeholder row is clicked
      FlowRouter.go(`/payment/${rowData._id}`);
    }
  }
});
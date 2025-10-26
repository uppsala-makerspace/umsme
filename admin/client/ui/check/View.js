import { ReactiveDict } from 'meteor/reactive-dict';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './View.html';

const updateInfo = (state) => {
  const mid = FlowRouter.getParam('_id');
  Meteor.call('storageCheck', mid, (err, res) => {
    state.set('checked', true);
    state.set('member', res.member);
    state.set('info', res.info);
    setTimeout(() => {
      const selectEl = document.getElementById('storageRequestSelect');
      if (res.info.storagerequest) {
        selectEl.value = res.info.storagerequest;
      } else {
        selectEl.value = '';
      }
    }, 100);
  });
};

Template.View.onCreated(function() {
  this.state = new ReactiveDict();
  this.state.set('checked', false);
  this.state.set('member', false);
  this.state.set('info', {});
  updateInfo(this.state);
  this.state.set('status', 'unknown');
});

Template.View.helpers({
  checked() {
    return Template.instance().state.get('checked');
  },
  member() {
    return Template.instance().state.get('member');
  },
  memberNow() {
    const memberDate = Template.instance().state.get('info').member;
    return new Date(memberDate) > new Date();
  },

  labMemberNow() {
    const labDate = Template.instance().state.get('info').lab;
    return new Date(labDate) > new Date();
  },

  embeddPath() {
    return Meteor.settings.public.checkPath || "../check";
  },

  info() {
    return Template.instance().state.get('info');
  },

  requestAllowed() {
    const info = Template.instance().state.get('info');
    return info.storage || info.storagequeue;
  }
});

Template.View.events({
  'click .addToStorageQueue': async function (event, instance) {
    const mid = FlowRouter.getParam('_id');
    await Meteor.callAsync('storageQueue', mid, true);
    updateInfo(instance.state);
  },
  'click .removeFromStorageQueue': async function (event, instance) {
    const mid = FlowRouter.getParam('_id');
    await Meteor.callAsync('storageQueue', mid, false);
    updateInfo(instance.state);
  },
  'click .storageRequest': async function (event, instance) {
    const mid = FlowRouter.getParam('_id');
    const requestvalue = document.getElementById('storageRequestSelect').value;
    await Meteor.callAsync('storageRequest', mid, requestvalue !== '' ? requestvalue : undefined);
    updateInfo(instance.state);
  }
});

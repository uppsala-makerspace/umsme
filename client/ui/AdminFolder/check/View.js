import './View.html';

const updateInfo = (state) => {
  const mid = FlowRouter.getParam('_id');
  Meteor.call('check', mid, (err, res) => {
    state.set('checked', true);
    state.set('member', res.member);
    state.set('info', res.info);
  });
};

Template.View.onCreated(function() {
  this.state = new ReactiveDict();
  this.state.set('checked', false);
  this.state.set('member', false);
  this.state.set('info', {});
  this.state.set('settings', {});
  updateInfo(this.state);
  Meteor.call('settings', (err, res) => {
    this.state.set('settings', res);
  });

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
    const settings = Template.instance().state.get('settings');
    return settings.checkPath || "../check";
  },

  info() {
    return Template.instance().state.get('info');
  }
});

Template.View.events({
  'click .addToStorageQueue': function (event, instance) {
    const mid = FlowRouter.getParam('_id');
    Meteor.call('queue', mid, true, (err, res) => {
      updateInfo(instance.state);
    });
  },
  'click .removeFromStorageQueue': function (event, instance) {
    const mid = FlowRouter.getParam('_id');
    Meteor.call('queue', mid, false, (err, res) => {
      updateInfo(instance.state);
    });
  }
});

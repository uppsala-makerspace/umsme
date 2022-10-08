import './View.html';

Template.View.onCreated(function() {
  this.state = new ReactiveDict();
  this.state.set('checked', false);
  this.state.set('member', false);
  this.state.set('info', {});
  this.state.set('settings', {});
  const mid = FlowRouter.getParam('_id');
  Meteor.call('check', mid, (err, res) => {
    this.state.set('checked', true);
    this.state.set('member', res.member);
    this.state.set('info', res.info);
  });
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
  'click .updateStorage': function (event, instance) {
    const newNumber = document.getElementById('storageInput').value;
    const mid = FlowRouter.getParam('_id');
    Meteor.call('storage', mid, newNumber, (err, res) => {
      debugger;
      if (res === 'current') {
        alert("This is already your storage number");
      } else if (res === 'updated') {
        alert(`Your storage box number was updated to ${newNumber}`);
      } else if (res === 'busy') {
        alert(`The storage box number you suggested is already occupied according to the records. If this is wrong, please notify us in the slack channel #storage and we will correct it.`);
      } else if (res === "invalid") {
        alert('You need to provide an integer');
      }
    });
  }
});

import './Find.html';

Template.Find.onCreated(function() {
  this.state = new ReactiveDict();
  this.state.set('mailSentTo', undefined);
});

Template.Find.helpers({
  mailSent() {
    return Template.instance().state.get('mailSentTo');
  }
});

Template.Find.events({
  'submit .findMemberForm': function (event, instance) {
    event.preventDefault();
    const email = event.target.email.value;
    const mid = event.target.number.value;
    Meteor.call('findMemberId', email, mid, (err, res) => {
      Meteor.call('settings', (err2, settings) => {
        if (settings.checkPath) {
          const url = settings.checkPath + res;
          top.window.location.href = url;
        } else {
          FlowRouter.go(`/check/${res}`);
        }
      });
    });
  },
  'submit .mailMemberForm': function (event, instance) {
    event.preventDefault();
    const email = event.target.email.value;
    Meteor.call('mailAboutMemberShip', email, (err, res) => {
      if (res) {
        instance.state.set('mailSentTo', email);
        event.target.email.value = '';
        setTimeout(() => {
          instance.state.set('mailSentTo', undefined);
        }, 10000);
      }
    });
  },
  'input .findMemberForm': function(event, instance) {
    if (event.currentTarget.email.value && event.currentTarget.email.checkValidity()
      && event.currentTarget.number.value && event.currentTarget.number.checkValidity()) {
      event.currentTarget.button.removeAttribute('disabled');
    } else {
      event.currentTarget.button.setAttribute('disabled', true);
    }
  },
  'input .mailMemberForm': function(event, instance) {
    if (event.currentTarget.email.value && event.currentTarget.email.checkValidity()) {
      event.currentTarget.button.removeAttribute('disabled');
    } else {
      event.currentTarget.button.setAttribute('disabled', true);
    }
  }
});
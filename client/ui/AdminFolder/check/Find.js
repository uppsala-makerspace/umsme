import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ReactiveDict } from 'meteor/reactive-dict';
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
  'submit .findMemberForm': async function (event, instance) {
    event.preventDefault();
    const email = event.target.email.value;
    const mid = event.target.number.value;
    try {
      const res = await Meteor.callAsync('findMemberId', email, mid);
      const checkPath = Meteor.settings.public.checkPath || "../check/";
      if (checkPath) {
        const url = checkPath + res;
        top.window.location.href = url;
      } else {
        FlowRouter.go(`/check/${res}`);
      }
    } catch(err) {
      alert("Wrong combination of email and member id");
    }
  },
  'submit .mailMemberForm': async function (event, instance) {
    event.preventDefault();
    const email = event.target.email.value;
    const res = await Meteor.callAsync('mailAboutMemberShip', email);
    if (res) {
      instance.state.set('mailSentTo', email);
      event.target.email.value = '';
      setTimeout(() => {
        instance.state.set('mailSentTo', undefined);
      }, 10000);
    }
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
import { Template } from 'meteor/templating';
import { Mails } from "/collections/mails";
import './MailView.html';

Template.MailView.onCreated(function() {
  Meteor.subscribe('mails');
});
Template.MailView.helpers({
  Mails() {
    return Mails;
  },
   mail() {
    const id = FlowRouter.getParam('_id');
    return Mails.findOne(id);
  },
});
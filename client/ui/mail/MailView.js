import { Template } from 'meteor/templating';
import { Mails } from "/collections/mails";
import './MailView.html';
import './Recipients';
import '../comment/CommentList';


Template.MailView.onCreated(function() {
  Meteor.subscribe('mails');
});
Template.MailView.helpers({
  Mails() {
    return Mails;
  },
  to() {
    const id = FlowRouter.getParam('_id');
    const mail = Mails.findOne(id);
    return mail.to;
  },
  mail() {
    const id = FlowRouter.getParam('_id');
    return Mails.findOne(id);
  },
  id() {
    return FlowRouter.getParam('_id');
  }
});
import { Template } from 'meteor/templating';
import { Mails } from "/collections/mails";
import { Comments } from '/collections/comments';
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

Template.MailView.events({
  'click .deleteMail': function (event) {
    const mid = FlowRouter.getParam('_id');
    if (confirm('Delete this mail')) {
      Comments.find({about: mid}).forEach((comm) => {Comments.remove(comm._id);});
      const member = Mails.findOne(mid);
      Mails.remove(mid);
      FlowRouter.go('/mail');
    }
  }
});

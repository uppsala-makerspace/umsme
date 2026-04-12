import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Mails } from "/imports/common/collections/mails";
import { Announcements } from '/imports/common/collections/announcements';
import { marked } from 'marked';
import { Comments } from '/imports/common/collections/comments';
import './MailView.html';
import './Recipients';
import '../comment/CommentList';


Template.MailView.onCreated(function() {
  Meteor.subscribe('mails');
  Meteor.subscribe('announcements');
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
  },
  announcement() {
    const id = FlowRouter.getParam('_id');
    return Announcements.findOne({ mailId: id });
  },
  isFormatted() {
    const id = FlowRouter.getParam('_id');
    const mail = Mails.findOne(id);
    return mail?.formatted;
  },
  formattedBody() {
    const id = FlowRouter.getParam('_id');
    const mail = Mails.findOne(id);
    return mail?.template ? new Spacebars.SafeString(marked.parse(mail.template, { breaks: true })) : '';
  }
});

Template.MailView.events({
  'click .extractToAnnouncement': function () {
    const mailId = FlowRouter.getParam('_id');
    const mail = Mails.findOne(mailId);
    if (!mail) return;
    const announcementId = Announcements.insert({
      type: 'newsletter',
      subjectSv: mail.subject,
      subjectEn: mail.subject,
      bodySv: mail.template,
      bodyEn: mail.template,
      status: 'sent',
      createdAt: mail.senddate,
      sentAt: mail.senddate,
      mailId,
    });
    FlowRouter.go(`/announcement/${announcementId}`);
  },
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

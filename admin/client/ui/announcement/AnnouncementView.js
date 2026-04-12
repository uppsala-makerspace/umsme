import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Announcements } from '/imports/common/collections/announcements';
import { Mails } from '/imports/common/collections/mails';
import { marked } from 'marked';
import moment from 'moment';
import './AnnouncementView.html';

Template.AnnouncementView.onCreated(function() {
  Meteor.subscribe('announcements');
  Meteor.subscribe('mails');
});

Template.AnnouncementView.helpers({
  announcement() {
    return Announcements.findOne(FlowRouter.getParam('_id'));
  },
  isSent() {
    return this.status === 'sent';
  },
  formatDate(date) {
    return date ? moment(date).format('YYYY-MM-DD HH:mm') : '';
  },
  markdown(text) {
    return text ? new Spacebars.SafeString(marked.parse(text, { breaks: true })) : '';
  }
});

Template.AnnouncementView.events({
  'click .deleteAnnouncement'(event) {
    event.preventDefault();
    const id = FlowRouter.getParam('_id');
    const announcement = Announcements.findOne(id);
    const message = announcement?.mailId
      ? 'Delete this announcement? The associated mail record will also be deleted, but emails already sent cannot be undone.'
      : 'Delete this announcement?';
    if (confirm(message)) {
      if (announcement?.mailId) {
        Mails.remove(announcement.mailId);
      }
      Announcements.remove(id);
      FlowRouter.go('/announcements');
    }
  },
  'click .sendAnnouncement'(event) {
    event.preventDefault();
    const id = FlowRouter.getParam('_id');
    FlowRouter.go(`/mail/send?announcement=${id}`);
  }
});

import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Announcements } from '/imports/common/collections/announcements';
import './AnnouncementNew.html';
import '../messagetemplate/MessageTemplateDocumentation';

Template.AnnouncementNew.onCreated(function() {
  Meteor.subscribe('announcements');
});

Template.AnnouncementNew.helpers({
  Announcements() {
    return Announcements;
  }
});

Template.AnnouncementNew.events({
  'click .cancelNew'(event) {
    event.preventDefault();
    FlowRouter.go('/announcements');
  }
});

AutoForm.hooks({
  announcementNewForm: {
    beginSubmit() {
      const insdoc = this.insertDoc;
      insdoc.status = 'draft';
      insdoc.createdAt = new Date();
    },
    onSubmit(doc) {
      const newId = Announcements.insert(doc);
      this.done();
      FlowRouter.go(`/announcement/${newId}`);
      return false;
    }
  }
});

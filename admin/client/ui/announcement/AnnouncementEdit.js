import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Announcements } from '/imports/common/collections/announcements';
import './AnnouncementEdit.html';
import '../messagetemplate/MessageTemplateDocumentation';

Template.AnnouncementEdit.onCreated(function() {
  Meteor.subscribe('announcements');
});

Template.AnnouncementEdit.helpers({
  Announcements() {
    return Announcements;
  },
  isSent() {
    const id = FlowRouter.getParam('_id');
    const announcement = Announcements.findOne(id);
    return announcement?.status === 'sent';
  },
  doc() {
    return Announcements.findOne(FlowRouter.getParam('_id'));
  }
});

Template.AnnouncementEdit.events({
  'click .cancelEdit'(event) {
    event.preventDefault();
    FlowRouter.go(`/announcement/${FlowRouter.getParam('_id')}`);
  }
});

AutoForm.hooks({
  announcementEditForm: {
    beginSubmit() {
      const insdoc = this.insertDoc;
      insdoc.status = this.currentDoc.status;
      insdoc.createdAt = this.currentDoc.createdAt;
    },
    onSubmit(doc) {
      const id = FlowRouter.getParam('_id');
      const { status, createdAt, sentAt, mailId, ...fields } = doc;
      Announcements.update(id, { $set: fields });
      this.done();
      FlowRouter.go(`/announcement/${id}`);
      return false;
    }
  }
});

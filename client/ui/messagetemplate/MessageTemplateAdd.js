import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { MessageTemplates } from '/collections/templates.js';
import './MessageTemplateAdd.html';
import './MessageTemplateDocumentation.html';

Template.MessageTemplateAdd.onCreated(function() {
  Meteor.subscribe('templates');
});

Template.MessageTemplateAdd.helpers({
  MessageTemplates() {
    return MessageTemplates;
  }
});

AutoForm.hooks({
  insertTemplateForm: {
    beginSubmit: function() {
      this.insertDoc.created = new Date();
      this.insertDoc.modified = new Date();
      this.insertDoc.deprecated = false;
    },
    onSubmit: function (doc) {
      const id = MessageTemplates.insert(doc);
      this.done();
      FlowRouter.go('/templates');
      return false;
    }
  }
});
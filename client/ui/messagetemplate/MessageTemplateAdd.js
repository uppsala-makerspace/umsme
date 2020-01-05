import { Template } from 'meteor/templating';
import { MessageTemplates } from '/collections/templates.js';
import './MessageTemplateAdd.html';

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
    },
    onSubmit: function (doc) {
      const id = MessageTemplates.insert(doc);
      this.done();
      FlowRouter.go('/templates');
      return false;
    }
  }
});
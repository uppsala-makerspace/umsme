import { Template } from 'meteor/templating';
import { MessageTemplates } from '/collections/templates';
import './MessageTemplateDocumentation.html';
import './MessageTemplateView.html';

Template.MembershipView.onCreated(function() {
  Meteor.subscribe('templates');
});
Template.MessageTemplateView.helpers({
  MessageTemplates() {
    return MessageTemplates;
  },
  messageTemplate() {
    const id = FlowRouter.getParam('_id');
    return MessageTemplates.findOne(id);
  }
});

Template.MessageTemplateView.events({
  'click .deleteTemplate': function (event) {
    if (confirm('Delete this message template')) {
      const id = FlowRouter.getParam('_id');
      MessageTemplates.remove(id);
      FlowRouter.go(`/templates`);
    }
  }
});

AutoForm.hooks({
  messageTemplateViewForm: {
    beginSubmit: function() {
      this.updateDoc.$set.modified = new Date();
    },

    endSubmit: function (doc) {
      FlowRouter.go('/templates');
    }
  }
});
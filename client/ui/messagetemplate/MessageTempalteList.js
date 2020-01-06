import { Template } from 'meteor/templating';
import { MessageTemplates } from '/collections/templates';
import { fields } from '../../../lib/fields';
import './MessageTemplateList.html';

Template.MessageTemplateList.helpers({
  settings: {
    collection: MessageTemplates,
    rowsPerPage: 10,
    showFilter: true,
    fields: fields.template.filter(obj => obj.key !== 'messagetext' && obj.key !== 'subject' && obj.key !== 'created' && obj.key !== 'modified'),
    class: "table table-bordered table-hover",
  }
});

Template.MessageTemplateList.events({
  'click .reactive-table tbody tr': function (event) {
    event.preventDefault();
    var post = this;
    FlowRouter.go(`/template/${post._id}`);
  }
});
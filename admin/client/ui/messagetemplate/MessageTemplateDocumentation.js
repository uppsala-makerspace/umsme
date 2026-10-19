import { Template } from 'meteor/templating';
import { themed } from '../../react/reactRoute';
import { TemplateDocumentation } from '/imports/ui/messageTemplates/TemplateDocumentation';
import './MessageTemplateDocumentation.html';

// The template variables, for the Blaze pages that still show them (mail,
// announcements): the React documentation, so there is one source.
const documentation = themed(TemplateDocumentation);

Template.MessageTemplateDocumentation.helpers({
  documentation: () => documentation,
});

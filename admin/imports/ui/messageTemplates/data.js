import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { MessageTemplates } from '/imports/common/collections/templates';

/**
 * Data for the message template pages: the narrow publications and the
 * methods. The pages' containers use this; the pure components never do.
 */

export const useMessageTemplateList = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.messageTemplates.list');
  return { loading: !handle.ready(), templates: MessageTemplates.find({}, { sort: { name: 1 } }).fetch() };
}, []);

/** One whole template; none when there is no id (a new template). */
export const useMessageTemplate = (docId) => useTracker(() => {
  if (!docId) return { loading: false, template: null };
  const handle = Meteor.subscribe('admin.messageTemplates.template', docId);
  return { loading: !handle.ready(), template: MessageTemplates.findOne(docId) };
}, [docId]);

/** The form's values for a template, or empty ones for a new template. */
export const formValues = (template) => ({
  name: template?.name || '',
  type: template?.type || '',
  membershiptype: template?.membershiptype || '',
  membertype: template?.membertype || '',
  subject: template?.subject || '',
  messagetext: template?.messagetext || '',
  auto: !!template?.auto,
  deprecated: !!template?.deprecated,
});

/** Create a template, or update one if a template is given. */
export const saveMessageTemplate = (values, template) => (template
  ? Meteor.callAsync('messageTemplates.update', template._id, values, template.modified ?? null)
  : Meteor.callAsync('messageTemplates.create', values));

export const removeMessageTemplate = (docId) => Meteor.callAsync('messageTemplates.remove', docId);

import { Meteor } from 'meteor/meteor';
import { template as compile } from 'underscore';
import { findBestTemplate, memberTemplateData, niceDate } from '/imports/common/lib/message';

export const STORAGE_NOTIFICATION_DEFAULT_FROM =
  'Uppsala Makerspace Hyllplats <hyllplats@uppsalamakerspace.se>';
export const STORAGE_NOTIFICATION_DEFAULT_REPLY_TO = 'hyllplats@uppsalamakerspace.se';

/**
 * Sender and reply-to for storage email. Overridable per app under
 * `private.storageNotifications` in settings.json (`from`, `replyTo`); the
 * defaults above apply when a key is missing or blank. Read at send time so a
 * test can change the settings without restarting.
 */
const storageNotificationSettings = () => Meteor.settings?.private?.storageNotifications || {};

const nonBlank = (value, fallback) =>
  (typeof value === 'string' && value.trim() ? value.trim() : fallback);

export const storageNotificationFrom = () =>
  nonBlank(storageNotificationSettings().from, STORAGE_NOTIFICATION_DEFAULT_FROM);

export const storageNotificationReplyTo = () =>
  nonBlank(storageNotificationSettings().replyTo, STORAGE_NOTIFICATION_DEFAULT_REPLY_TO);

/**
 * Storage decision type -> message template type in the Templates collection.
 * Administrators edit the texts under Templates in admin; the defaults in
 * ./defaults.js are seeded once so a fresh database can send from day one.
 */
export const STORAGE_TEMPLATE_TYPES = Object.freeze({
  assignment: 'storageAssignment',
  move: 'storageMove',
  warning: 'storageWarning',
  reminder: 'storageReminder',
  reclamation: 'storageReclamation',
  voluntary_release: 'storageRelease',
});

export const STORAGE_DECISION_TYPES = Object.freeze(Object.keys(STORAGE_TEMPLATE_TYPES));

/**
 * Variables available to a storage template, on top of the common member
 * variables from memberTemplateData. Dates are YYYY-MM-DD like everywhere else.
 */
export const storageTemplateData = async ({ owner, unit_name, deadline_at } = {}) => ({
  ...(owner ? await memberTemplateData(owner) : {}),
  name: owner?.name || '',
  unitName: unit_name || '',
  deadline: deadline_at instanceof Date ? niceDate(deadline_at) : '',
});

const memberTypeFor = (owner) => {
  if (owner?.youth) return 'youth';
  if (owner?.family) return 'family';
  return 'normal';
};

export const findStorageTemplate = async (decisionType, owner) => {
  const type = STORAGE_TEMPLATE_TYPES[decisionType];
  if (!type) return null;
  return findBestTemplate({ auto: true, type, membershiptype: 'lab', membertype: memberTypeFor(owner) });
};

/**
 * Render the message for a storage decision from the administrator-editable
 * template. `context` carries the owner (paying member) plus the unit name
 * and deadline the decision is about.
 */
export const renderStorageNotification = async (decisionType, context = {}) => {
  const type = STORAGE_TEMPLATE_TYPES[decisionType];
  if (!type) return { status: 'missing_template', error: `Unknown storage message type: ${decisionType}` };
  const messageTemplate = await findStorageTemplate(decisionType, context.owner);
  if (!messageTemplate) {
    return {
      status: 'missing_template',
      error: `No message template of type "${type}" exists. Add one under Templates in admin.`,
    };
  }
  try {
    const data = await storageTemplateData(context);
    return {
      status: 'rendered',
      template_id: messageTemplate._id,
      sender_from: storageNotificationFrom(),
      reply_to: storageNotificationReplyTo(),
      subject: compile(messageTemplate.subject)(data),
      email: compile(messageTemplate.messagetext)(data),
    };
  } catch (error) {
    return { status: 'render_failed', error: `Template "${messageTemplate.name}" failed to render: ${error.message}` };
  }
};

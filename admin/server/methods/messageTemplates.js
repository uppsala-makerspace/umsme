import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import {
  createMessageTemplate,
  updateMessageTemplate,
  removeMessageTemplate,
} from '/imports/common/server/messageTemplates/templates';

const TemplateFields = {
  name: String,
  type: String,
  // Empty or null means any.
  membershiptype: Match.Optional(Match.OneOf(String, null)),
  membertype: Match.Optional(Match.OneOf(String, null)),
  subject: String,
  messagetext: String,
  auto: Match.Optional(Boolean),
  deprecated: Match.Optional(Boolean),
};

Meteor.methods({
  async 'messageTemplates.create'(fields) {
    check(fields, TemplateFields);
    await requireRole(this.userId, DOMAIN_ROLES.messageTemplates);
    return createMessageTemplate(fields, { userId: this.userId });
  },

  async 'messageTemplates.update'(docId, fields, expectedModified) {
    check(docId, String);
    check(fields, TemplateFields);
    check(expectedModified, Match.Maybe(Date));
    await requireRole(this.userId, DOMAIN_ROLES.messageTemplates);
    await updateMessageTemplate(docId, fields, { userId: this.userId, expectedModified: expectedModified ?? null });
  },

  async 'messageTemplates.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, DOMAIN_ROLES.messageTemplates);
    await removeMessageTemplate(docId, { userId: this.userId });
  },
});

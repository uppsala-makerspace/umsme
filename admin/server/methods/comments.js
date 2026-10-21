import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { addComment, updateComment, removeComment } from '/imports/common/server/comments/comments';

const roles = DOMAIN_ROLES.comments;

Meteor.methods({
  async 'comments.add'(about, text) {
    check(about, String);
    check(text, String);
    await requireRole(this.userId, roles);
    return addComment(about, text, { userId: this.userId });
  },
  async 'comments.update'(docId, text) {
    check(docId, String);
    check(text, String);
    await requireRole(this.userId, roles);
    await updateComment(docId, text, { userId: this.userId });
  },
  async 'comments.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    await removeComment(docId, { userId: this.userId });
  },
});

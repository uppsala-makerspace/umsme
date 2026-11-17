import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { requireRole, DOMAIN_ROLES } from '/imports/common/server/authz';
import { createCategory, updateCategory, removeCategory } from '/imports/common/server/categories';

// Board and admin: the categories are the website's filter for groups,
// workshops, activities and events alike.
const roles = DOMAIN_ROLES.categories;
const Bilingual = Match.Maybe({ sv: Match.Maybe(String), en: Match.Maybe(String) });
const CategoryFields = {
  name: Bilingual,
  slug: Match.Optional(Match.Maybe(String)),
  sortOrder: Match.Optional(Match.Maybe(Number)),
};

Meteor.methods({
  async 'categories.create'(fields) {
    check(fields, CategoryFields);
    await requireRole(this.userId, roles);
    return createCategory(fields, { userId: this.userId });
  },

  async 'categories.update'(docId, fields, expectedUpdatedAt) {
    check(docId, String);
    check(fields, CategoryFields);
    check(expectedUpdatedAt, Match.Maybe(Date));
    await requireRole(this.userId, roles);
    await updateCategory(docId, fields, { userId: this.userId, expectedUpdatedAt: expectedUpdatedAt ?? null });
  },

  async 'categories.remove'(docId) {
    check(docId, String);
    await requireRole(this.userId, roles);
    await removeCategory(docId, { userId: this.userId });
  },
});

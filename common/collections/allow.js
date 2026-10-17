/**
 * Who may write a collection directly from the client, through the mutation
 * methods Meteor defines for every collection (/members/insert and so on).
 *
 * Those methods are callable over DDP by any logged-in connection to any of
 * the apps, whether or not the collection is published there. Only the admin
 * client writes directly; the member app goes through methods. So direct
 * writes are for staff: a member logged into the app must not be able to, say,
 * insert a membership for themselves.
 */
export const STAFF_WRITE_ROLES = ['admin', 'board', 'treasurer'];

// Looked up rather than imported: the payment app has no roles package, and
// without it nobody can hold a staff role, so every client write is refused.
const rolesPackage = () => Package.roles?.Roles;

const hasRole = (roles) => async (userId) => {
  const Roles = rolesPackage();
  if (!userId || !Roles) return false;
  return Roles.userIsInRoleAsync(userId, roles);
};

export const allow = (collection, roles = STAFF_WRITE_ROLES) => {
  const f = hasRole(roles);
  collection.allow({
    insert: f,
    update: f,
    remove: f
  });
};

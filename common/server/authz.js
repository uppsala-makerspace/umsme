import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/roles';

/**
 * Authorization for server methods and publications: who may do what. See
 * plan/migration.md; new methods use these instead of checking roles by hand.
 */

/** The roles that may read and write each admin domain. */
export const DOMAIN_ROLES = {
  liability: ['admin', 'board'],
  messageTemplates: ['admin', 'board'],
  storeItems: ['admin', 'board'],
  spaces: ['admin', 'board'],
  groups: ['admin', 'board'],
  workshops: ['admin', 'board'],
  memberLookup: ['admin', 'board'],
  certificates: ['admin', 'board'],
  announcements: ['admin', 'board'],
  stats: ['admin', 'board'],
  lock: ['admin'],
};

/** Whether the user holds any of the roles. */
export const hasRole = async (userId, roles) =>
  !!userId && Roles.userIsInRoleAsync(userId, roles);

/** Throws unless the user holds one of the roles. */
export const requireRole = async (userId, roles) => {
  if (!(await hasRole(userId, roles))) {
    throw new Meteor.Error('not-authorized', 'You do not have access to this');
  }
};

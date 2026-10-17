import 'meteor/aldeed:collection2/static';
import { allow } from './allow';

// Collection exists already
//Meteor.users.attachSchema(schemas.users);

// UserView edits and removes accounts; only admin and board see them.
allow(Meteor.users, ['admin', 'board']);

// No allow rules on Meteor.roles or Meteor.roleAssignment: roles are changed
// only through server methods (addToAdminGroup and the like). An allow rule
// here would let a client grant itself any role.

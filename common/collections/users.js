// No allow rules on Meteor.users: admin changes accounts through the users.*
// methods (common/server/users), and the app never writes them from the client.
// No allow rules on Meteor.roles or Meteor.roleAssignment either: an allow
// rule there would let a client grant itself any role.

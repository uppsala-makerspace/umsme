import 'meteor/aldeed:collection2/static';
import { allow } from './allow';

// Collection exists already
//Meteor.users.attachSchema(schemas.users);
allow(Meteor.users);

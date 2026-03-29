import './initTabular';
import 'meteor/aldeed:collection2/static';
import { Roles } from 'meteor/roles';
import Tabular from 'meteor/aldeed:tabular';

const columns = [
  {
    data: 'username',
    title: 'Username'
  },
  {
    data: 'emails',
    title: 'Email',
    render: (val) => val && val[0] && val[0].address || ''
  }
];

new Tabular.Table({
  name: "Users",
  autoWidth: false,
  collection: Meteor.users,
  columns,
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, 'admin')
});
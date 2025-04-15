import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';

const columns = [
  {
    data: 'username',
    title: 'Username'
  },
  {
    data: 'email',
    title: 'Email'
  }
];

new Tabular.Table({
  name: "Users",
  autoWidth: false,
  collection: Meteor.users,
  columns,
  async allow(userID) {
    return Promise.resolve(userID !== null);
  }
});
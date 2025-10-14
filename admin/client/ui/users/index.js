import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './UserList';
import './UserView';
import './UserAdd';

FlowRouter.route('/users', {
  name: 'users',
  action() {
    this.render('AppBody', {main: 'UserList'});
  }
});

FlowRouter.route('/users/add', {
  name: 'usersadd',
  action() {
    this.render('AppBody', {main: 'UserAdd'});
  }
});

FlowRouter.route('/user/:_id', {
  name: 'userview',
  action() {
    this.render('AppBody', {main: 'UserView'});
  }
});
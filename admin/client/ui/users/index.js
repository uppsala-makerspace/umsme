import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './UserList';
import './UserView';

FlowRouter.route('/users', {
  name: 'users',
  action() {
    this.render('AppBody', {main: 'UserList'});
  }
});

FlowRouter.route('/user/:_id', {
  name: 'userview',
  action() {
    this.render('AppBody', {main: 'UserView'});
  }
});
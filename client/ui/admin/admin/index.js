import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import "./Admin";

FlowRouter.route('/admin/admin', {
  name: 'admin',
  waitOn() {
    return [
      import('../main'),
      import('./Admin')
    ]
  },
  action() {
    this.render('AppBody', {main: 'AdminConsole'});
  }
});
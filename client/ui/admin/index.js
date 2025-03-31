import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import "./Admin";

FlowRouter.route('/admin', {
  name: 'admin',
  action() {
    this.render('AppBody', {main: 'AdminConsole'});
  }
});
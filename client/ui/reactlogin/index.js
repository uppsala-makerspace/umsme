import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import "./Login";

FlowRouter.route('/login', {
  name: 'login',
  action() {
    this.render('AppBody', { main: 'Login' });
  }
});

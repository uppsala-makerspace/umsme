import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './members';
import './history';
import './membership';
import './storage';
import './stats';
import './messagetemplate';
import './message';
import './mail';
import './lock';
import './family';
import './door';
import './check';
import './admin';
import './bank';

FlowRouter.route('/admin', {
  name: 'admin_home',
  waitOn() {
    return [
      import('./main'),
      import('../../layouts/Home.html')
    ]
  },
  action() {
    this.render('AppBody', {main: 'Home'});
  }
});

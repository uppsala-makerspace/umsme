import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './members';
/*import './ui/membership';
import './ui/message';
import './ui/family';
import './ui/storage';
import './ui/stats';
import './ui/messagetemplate';
import './ui/mail';
import './ui/lock';
import './ui/history';
import './ui/admin';
import './ui/bank';
import './ui/door';
import './ui/check'*/

FlowRouter.route('/admin', {
  name: 'admin_home',
  waitOn() {
    console.log("hjksdhfjklshjfkldsfjkl");
    return [
      import('./main'),
      import('../../layouts/Home.html')
    ]
  },
  action() {
    console.log("hepåp");
    this.render('AppBody', {main: 'Home'});
  }
});

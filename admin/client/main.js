import 'datatables.net-bs/css/dataTables.bootstrap.css';
import 'bootstrap/dist/css/bootstrap.min.css'
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './ui/members';
import './ui/membership';
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
import './ui/check';
import './ui/users';
import './ui/liability';
import './ui/certificates';
import './layouts/AppBody.html';
import './layouts/Home.html';
import { Accounts } from 'meteor/accounts-base';
import { AutoFormThemeBootstrap3 } from 'meteor/communitypackages:autoform-bootstrap3/static';
AutoFormThemeBootstrap3.load();

Accounts.ui.config({
  passwordSignupFields: "USERNAME_AND_OPTIONAL_EMAIL",
});

FlowRouter.route('/', {
  name: 'home',
  action() {
    this.render('AppBody', {main: 'Home'});
  }
});


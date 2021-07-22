import "./layouts/AppBody.html";
import "./layouts/Home.html";
import "./layouts/Contact.html";
import "./ui/members/index";
import "./ui/membership/index";
import "./ui/family/index";
import './ui/bank/index';
import './ui/admin/index';
import './ui/messagetemplate/index';
import './ui/message/index';
import './ui/mail/index';
import './ui/lock/index';
import './ui/stats/index';
import './ui/door/index';
import '/lib/accounts-config';
import './ui/check/index';

FlowRouter.route('/', {
  name: 'home',
  action() {
    BlazeLayout.render('AppBody', {main: 'Home'});
  }
});

FlowRouter.route('/contact', {
  name: 'contact',
  action() {
    BlazeLayout.render('AppBody', {main: 'Contact'});
  }
});
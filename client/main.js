import "../client/layouts/AppBody.html";
import "../client/layouts/Home.html";
import "../client/layouts/Contact.html";
import "./ui/members/index";
import "./ui/membership/index";
import "./ui/family/index";
import './ui/bank/index';
import './ui/admin/index';
import './ui/messagetemplate/index';
import './ui/message/index';

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
import "../client/layouts/AppBody.html";
import "../client/layouts/Home.html";
import "../client/layouts/Contact.html";
import "./ui/members/index";
import "./ui/membership/index";

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
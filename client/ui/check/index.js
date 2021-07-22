import "../../layouts/Clean.html";

import './Find';
import './View';

FlowRouter.route('/check', {
  name: 'check',
  action() {
    BlazeLayout.render('Clean', {main: 'Find'});
  }
});

FlowRouter.route('/check/:_id', {
  name: 'memberview',
  action(params) {
    BlazeLayout.render('Clean', {main: 'View'});
  }
});
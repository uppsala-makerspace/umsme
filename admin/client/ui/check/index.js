import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import "../../layouts/Clean.html";
import './Find';
import './View';

FlowRouter.route('/check', {
  name: 'check',
  action() {
    this.render('Clean', {main: 'Find'});
  }
});

FlowRouter.route('/check/:_id', {
  name: 'memberview',
  action(params) {
    this.render('Clean', {main: 'View'});
  }
});
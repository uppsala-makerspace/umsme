import "./MembershipAdd";
import "./MembershipView";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/memberships/add', {
  name: 'addmembership',
  action() {
    this.render('AppBody', {main: 'MembershipAdd'});
  }
});

FlowRouter.route('/membership/:_id', {
  name: 'memberview',
  action() {
    this.render('AppBody', {main: 'MembershipView'});
  }
});
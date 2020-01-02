import "./MemberAdd";
import "./MemberList";
import "./MemberView";
import { Members } from '../../../collections/members.js';

FlowRouter.route('/members', {
  name: 'members',
  action() {
    BlazeLayout.render('AppBody', {main: 'MemberList'});
  }
});

FlowRouter.route('/members/add', {
  name: 'addmember',
  action() {
    BlazeLayout.render('AppBody', {main: 'MemberAdd'});
  }
});

FlowRouter.route('/member/:_id', {
  name: 'memberview',
  action(params) {
    BlazeLayout.render('AppBody', {main: 'MemberView'});
  }
});
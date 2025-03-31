import "./MemberAdd";
import "./MemberList";
import "./MemberView";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';


FlowRouter.route('/members', {
  name: 'members',
  action() {
    this.render('AppBody', {main: 'MemberList'});
  }
});

FlowRouter.route('/members/add', {
  name: 'addmember',
  action() {
    this.render('AppBody', {main: 'MemberAdd'});
  }
});

FlowRouter.route('/member/:_id', {
  name: 'memberview',
  action() {
    this.render('AppBody', {main: 'MemberView'});
  }
});
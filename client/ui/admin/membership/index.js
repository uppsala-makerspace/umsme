import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/memberships/add', {
  name: 'addmembership',
  waitOn() {
    return [
      import('../main'),
      import('./MembershipAdd')
    ];
  },
  action() {
    this.render('AppBody', {main: 'MembershipAdd'});
  }
});

FlowRouter.route('/admin/membership/:_id', {
  name: 'memberview',
  waitOn() {
    return [
      import('../main'),
      import('./MembershipView')
    ];
  },
  action() {
    this.render('AppBody', {main: 'MembershipView'});
  }
});
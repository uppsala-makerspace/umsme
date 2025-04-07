import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/members', {
  name: 'members',
  waitOn() {
    return [
      import('../main'),
      import('./MemberList')
    ]
  },
  action() {
    this.render('AppBody', {main: 'MemberList'});
  }
});

FlowRouter.route('/admin/members/add', {
  name: 'addmember',
  waitOn() {
    return [
      import('../main'),
      import('./MemberAdd')
    ];
  },
  action() {
    this.render('AppBody', {main: 'MemberAdd'});
  }
});

FlowRouter.route('/admin/member/:_id', {
  name: 'memberview',
  waitOn() {
    return [
      import('../main'),
      import('./MemberView')
    ];
  },
  action() {
    this.render('AppBody', {main: 'MemberView'});
  }
});
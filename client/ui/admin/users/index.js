import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/users', {
  name: 'users',
  waitOn() {
    return [
      import('../main'),
      import('./UserList')
    ]
  },
  action() {
    this.render('AppBody', {main: 'UserList'});
  }
});

FlowRouter.route('/admin/user/:_id', {
  name: 'userview',
  waitOn() {
    return [
      import('../main'),
      import('./UserView')
    ];
  },
  action() {
    this.render('AppBody', {main: 'UserView'});
  }
});
/*
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

*/
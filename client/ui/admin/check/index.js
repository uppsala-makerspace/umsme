import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/check', {
  name: 'check',
  waitOn() {
    return [
      import('../main'),
      import('../../layouts/Clean.html'),
      import('./Find')
    ]
  },
  action() {
    this.render('Clean', {main: 'Find'});
  }
});

FlowRouter.route('/admin/check/:_id', {
  name: 'memberview',
  waitOn() {
    return [
      import('../main'),
      import('../../layouts/Clean.html'),
      import('./View')
    ]
  },
  action(params) {
    this.render('Clean', {main: 'View'});
  }
});
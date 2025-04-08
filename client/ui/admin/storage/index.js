import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/storage', {
  name: 'storage',
  waitOn() {
    return [
      import('../main'),
      import('./Storage')
    ];
  },
  action() {
    this.render('AppBody', {main: 'Storage'});
  }
});


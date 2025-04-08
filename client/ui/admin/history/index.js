import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/history', {
  name: 'history',
  waitOn() {
    return [
      import('../main'),
      import('./History')
    ]
  },
  action() {
    this.render('AppBody', {main: 'History'});
  }
});
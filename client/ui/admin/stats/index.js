import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/stats', {
  name: 'statistics',
  waitOn() {
    return [
      import('../main'),
      import('./Statistics')
    ];
  },
  action() {
    this.render('AppBody', {main: 'Statistics'});
  }
});
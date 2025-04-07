import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/lock', {
  name: 'lock',
  waitOn() {
    return [
      import('../main'),
      import('./Lockusers')
    ]
  },
  action() {
    this.render('AppBody', {main: 'Lockusers'});
  }
});
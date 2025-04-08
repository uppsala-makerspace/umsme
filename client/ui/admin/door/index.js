import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/door', {
  name: 'door',
  waitOn() {
    return [
      import('../main'),
      import('./DoorStats')
    ]
  },
  action() {
    this.render('AppBody', {main: 'DoorStats'});
  }
});
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/payments', {
  name: 'payments',
  waitOn() {
    return [
      import('../main'),
      import('./Payments')
    ]
  },
  action() {
    this.render('AppBody', {main: 'Payments'});
  }
});

FlowRouter.route('/admin/payment/:_id', {
  name: 'payment',
  waitOn() {
    return [
      import('../main'),
      import('./PaymentView')
    ]
  },
  action() {
    this.render('AppBody', {main: 'PaymentView'});
  }
});
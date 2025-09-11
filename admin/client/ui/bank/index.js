import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './Payments';
import './PaymentView'

FlowRouter.route('/payments', {
  name: 'payments',
  action() {
    this.render('AppBody', {main: 'Payments'});
  }
});

FlowRouter.route('/payment/:_id', {
  name: 'payment',
  action() {
    this.render('AppBody', {main: 'PaymentView'});
  }
});
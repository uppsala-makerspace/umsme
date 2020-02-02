import './Payments';
import './PaymentView'

FlowRouter.route('/payments', {
  name: 'payments',
  action() {
    BlazeLayout.render('AppBody', {main: 'Payments'});
  }
});

FlowRouter.route('/payment/:_id', {
  name: 'payment',
  action() {
    BlazeLayout.render('AppBody', {main: 'PaymentView'});
  }
});
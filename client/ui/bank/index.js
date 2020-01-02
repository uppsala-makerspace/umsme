import './Payments';
import './Callback'

FlowRouter.route('/payments', {
  name: 'payments',
  action() {
    BlazeLayout.render('AppBody', {main: 'Payments'});
  }
});

FlowRouter.route('/callback', {
  name: 'callback',
  action() {
    BlazeLayout.render('AppBody', {main: 'Callback'});
  }
});
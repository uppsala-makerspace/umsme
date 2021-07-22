import './DoorStats';

FlowRouter.route('/door', {
  name: 'door',
  action() {
    BlazeLayout.render('AppBody', {main: 'DoorStats'});
  }
});
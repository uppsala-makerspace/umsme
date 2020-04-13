import './Statistics';

FlowRouter.route('/stats', {
  name: 'statistics',
  action() {
    BlazeLayout.render('AppBody', {main: 'Statistics'});
  }
});
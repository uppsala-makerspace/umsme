import './History';

FlowRouter.route('/history', {
  name: 'history',
  action() {
    BlazeLayout.render('AppBody', {main: 'History'});
  }
});
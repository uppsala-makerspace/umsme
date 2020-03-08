import './Lockusers';

FlowRouter.route('/lock', {
  name: 'lock',
  action() {
    BlazeLayout.render('AppBody', {main: 'Lockusers'});
  }
});
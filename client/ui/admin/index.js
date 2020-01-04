import "./Admin";

FlowRouter.route('/admin', {
  name: 'admin',
  action(params) {
    BlazeLayout.render('AppBody', {main: 'AdminConsole'});
  }
});
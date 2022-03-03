import "./Storage";

FlowRouter.route('/storage', {
  name: 'storage',
  action() {
    BlazeLayout.render('AppBody', {main: 'Storage'});
  }
});


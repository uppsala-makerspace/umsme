import './LockUserHistory';

FlowRouter.route('/lockuserhistory', {
  name: 'lockuserhistory',
  action() {
    BlazeLayout.render('AppBody', {main: 'LockUserHistory'});
  }
});

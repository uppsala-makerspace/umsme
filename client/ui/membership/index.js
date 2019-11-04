import "./MembershipAdd";

/*FlowRouter.route('/members', {
  name: 'members',
  action() {
    BlazeLayout.render('AppBody', {main: 'MemberList'});
  }
});
*/
FlowRouter.route('/memberships/add', {
  name: 'addmembership',
  action() {
    BlazeLayout.render('AppBody', {main: 'MembershipAdd'});
  }
});

/*FlowRouter.route('/membership/:_id', {
  name: 'memberview',
  action(params) {
    BlazeLayout.render('AppBody', {main: 'MembershipView'});
  }
});

/*FlowRouter.route('/member/:_id/edit', {
  name: 'memberedit',
  action(params) {
    BlazeLayout.render('AppBody', {main: 'MemberEdit'});
  }
});
*/
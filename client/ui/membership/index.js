import "./MembershipAdd";
import "./MembershipView";

FlowRouter.route('/memberships/add', {
  name: 'addmembership',
  action() {
    BlazeLayout.render('AppBody', {main: 'MembershipAdd'});
  }
});

FlowRouter.route('/membership/:_id', {
  name: 'memberview',
  action(params) {
    BlazeLayout.render('AppBody', {main: 'MembershipView'});
  }
});
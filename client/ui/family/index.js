import "./ProspectiveFamilyMemberList";

FlowRouter.route('/member/:_id/add', {
  name: 'familymemberadd',
  action(params) {
    BlazeLayout.render('AppBody', {main: 'ProspectiveFamilyMemberList'});
  }
});
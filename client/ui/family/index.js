import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import "./ProspectiveFamilyMemberList";

FlowRouter.route('/member/:_id/add', {
  name: 'familymemberadd',
  action() {
    this.render('AppBody', {main: 'ProspectiveFamilyMemberList'});
  }
});
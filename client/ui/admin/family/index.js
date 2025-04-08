import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/member/:_id/add', {
  name: 'familymemberadd',
  waitOn() {
    return [
      import('../main'),
      import('./ProspectiveFamilyMemberList')
    ]
  },
  action() {
    this.render('AppBody', {main: 'ProspectiveFamilyMemberList'});
  }
});
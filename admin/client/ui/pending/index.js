import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './PendingMembers';

FlowRouter.route('/pending', {
  name: 'pending',
  action() {
    this.render('AppBody', { main: 'PendingMembers' });
  },
});

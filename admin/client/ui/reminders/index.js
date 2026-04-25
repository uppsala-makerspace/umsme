import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './Reminders';

FlowRouter.route('/reminders', {
  name: 'reminders',
  action() {
    this.render('AppBody', { main: 'Reminders' });
  },
});

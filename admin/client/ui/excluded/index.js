import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './Excluded';

FlowRouter.route('/excluded', {
  name: 'excluded',
  action() {
    this.render('AppBody', { main: 'Excluded' });
  },
});

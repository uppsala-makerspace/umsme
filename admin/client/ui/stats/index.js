import './Statistics';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/stats', {
  name: 'statistics',
  action() {
    this.render('AppBody', {main: 'Statistics'});
  }
});
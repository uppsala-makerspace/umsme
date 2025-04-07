import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './History';

FlowRouter.route('/history', {
  name: 'history',
  action() {
    this.render('AppBody', {main: 'History'});
  }
});
import './Revenue';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/revenue', {
  name: 'revenue',
  action() {
    this.render('AppBody', {main: 'Revenue'});
  }
});

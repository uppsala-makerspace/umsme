import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './Lockusers';

FlowRouter.route('/lock', {
  name: 'lock',
  action() {
    this.render('AppBody', {main: 'Lockusers'});
  }
});
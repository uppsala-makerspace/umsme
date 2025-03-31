import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './DoorStats';

FlowRouter.route('/door', {
  name: 'door',
  action() {
    this.render('AppBody', {main: 'DoorStats'});
  }
});
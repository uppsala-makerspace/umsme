import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './DoorStats';
import './DoorUnlocksList';

FlowRouter.route('/door', {
  name: 'door',
  action() {
    this.render('AppBody', {main: 'DoorStats'});
  }
});

FlowRouter.route('/doorunlocks', {
  name: 'doorunlocks',
  action() {
    this.render('AppBody', {main: 'DoorUnlocksList'});
  }
});
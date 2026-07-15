import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './WorkshopList';
import './WorkshopAdd';
import './WorkshopView';

FlowRouter.route('/workshops', {
  name: 'workshops',
  action() {
    this.render('AppBody', { main: 'WorkshopList' });
  },
});

FlowRouter.route('/workshops/add', {
  name: 'addworkshop',
  action() {
    this.render('AppBody', { main: 'WorkshopAdd' });
  },
});

FlowRouter.route('/workshop/:_id', {
  name: 'workshopview',
  action() {
    this.render('AppBody', { main: 'WorkshopView' });
  },
});

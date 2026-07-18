import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './SpaceList';
import './SpaceAdd';
import './SpaceView';

FlowRouter.route('/spaces', {
  name: 'spaces',
  action() {
    this.render('AppBody', { main: 'SpaceList' });
  },
});

FlowRouter.route('/spaces/add', {
  name: 'addspace',
  action() {
    this.render('AppBody', { main: 'SpaceAdd' });
  },
});

FlowRouter.route('/space/:_id', {
  name: 'spaceview',
  action() {
    this.render('AppBody', { main: 'SpaceView' });
  },
});

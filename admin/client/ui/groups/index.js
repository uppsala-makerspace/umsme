import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './GroupList';
import './GroupAdd';
import './GroupView';

FlowRouter.route('/groups', {
  name: 'groups',
  action() {
    this.render('AppBody', { main: 'GroupList' });
  },
});

FlowRouter.route('/groups/add', {
  name: 'addgroup',
  action() {
    this.render('AppBody', { main: 'GroupAdd' });
  },
});

FlowRouter.route('/group/:_id', {
  name: 'groupview',
  action() {
    this.render('AppBody', { main: 'GroupView' });
  },
});

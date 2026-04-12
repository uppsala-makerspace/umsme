import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './AnnouncementList';
import './AnnouncementNew';
import './AnnouncementEdit';
import './AnnouncementView';

FlowRouter.route('/announcements', {
  name: 'announcements',
  action() {
    this.render('AppBody', {main: 'AnnouncementList'});
  }
});

FlowRouter.route('/announcements/new', {
  name: 'announcementNew',
  action() {
    this.render('AppBody', {main: 'AnnouncementNew'});
  }
});

FlowRouter.route('/announcement/:_id', {
  name: 'announcementView',
  action() {
    this.render('AppBody', {main: 'AnnouncementView'});
  }
});

FlowRouter.route('/announcement/:_id/edit', {
  name: 'announcementEdit',
  action() {
    this.render('AppBody', {main: 'AnnouncementEdit'});
  }
});

import "./Storage";
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/storage', {
  name: 'storage',
  action() {
    this.render('AppBody', {main: 'Storage'});
  }
});


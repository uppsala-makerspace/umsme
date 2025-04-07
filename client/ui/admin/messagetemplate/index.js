import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import "./MessageTempalteList";
import "./MessageTemplateAdd";
import "./MessageTemplateView";

FlowRouter.route('/templates', {
  name: 'templates',
  action() {
    this.render('AppBody', {main: 'MessageTemplateList'});
  }
});

FlowRouter.route('/templates/add', {
  name: 'addtemplate',
  action() {
    this.render('AppBody', {main: 'MessageTemplateAdd'});
  }
});

FlowRouter.route('/template/:_id', {
  name: 'templateview',
  action() {
    this.render('AppBody', {main: 'MessageTemplateView'});
  }
});
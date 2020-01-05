import "./MessageTempalteList";
import "./MessageTemplateAdd";
import "./MessageTemplateView";

FlowRouter.route('/templates', {
  name: 'templates',
  action() {
    BlazeLayout.render('AppBody', {main: 'MessageTemplateList'});
  }
});

FlowRouter.route('/templates/add', {
  name: 'addtemplate',
  action() {
    BlazeLayout.render('AppBody', {main: 'MessageTemplateAdd'});
  }
});

FlowRouter.route('/template/:_id', {
  name: 'templateview',
  action(params) {
    BlazeLayout.render('AppBody', {main: 'MessageTemplateView'});
  }
});
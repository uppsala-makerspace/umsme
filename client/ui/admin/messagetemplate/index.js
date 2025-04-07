import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/templates', {
  name: 'templates',
  waitOn() {
    return [
      import('../main'),
      import('./MessageTemplateList')
    ];
  },
  action() {
    this.render('AppBody', {main: 'MessageTemplateList'});
  }
});

FlowRouter.route('/admin/templates/add', {
  name: 'addtemplate',
  waitOn() {
    return [
      import('../main'),
      import('./MessageTemplateAdd')
    ];
  },
  action() {
    this.render('AppBody', {main: 'MessageTemplateAdd'});
  }
});

FlowRouter.route('/admin/template/:_id', {
  name: 'templateview',
  waitOn() {
    return [
      import('../main'),
      import('./MessageTemplateView')
    ];
  },
  action() {
    this.render('AppBody', {main: 'MessageTemplateView'});
  }
});
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/message/send', {
  name: 'sendmessage',
  waitOn() {
    return [
      import('../main'),
      import('./SendMessage')
    ];
  },
  action() {
    this.render('AppBody', {main: 'SendMessage'});
  }
});

FlowRouter.route('/admin/message/:_id', {
  name: 'messageview',
  waitOn() {
    return [
      import('../main'),
      import('./MessageView')
    ];
  },
  action() {
    this.render('AppBody', {main: 'MessageView'});
  }
});
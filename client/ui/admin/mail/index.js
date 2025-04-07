import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/admin/mail', {
  name: 'mails',
  waitOn() {
    return [
      import('../main'),
      import('./MailList')
    ]
  },
  action() {
    this.render('AppBody', {main: 'MailList'});
  }
});

FlowRouter.route('/admin/mail/send', {
  name: 'sendmail',
  waitOn() {
    return [
      import('../main'),
      import('./SendMail')
    ]
  },
  action() {
    this.render('AppBody', {main: 'SendMail'});
  }
});

FlowRouter.route('/admin/mail/:_id', {
  name: 'mailview',
  waitOn() {
    return [
      import('../main'),
      import('./MailView')
    ]
  },
  action(params) {
    this.render('AppBody', {main: 'MailView'});
  }
});
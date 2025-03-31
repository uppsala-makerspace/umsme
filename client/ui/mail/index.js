import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './MailList';
import './SendMail';
import './MailView';

FlowRouter.route('/mail', {
  name: 'mails',
  action() {
    this.render('AppBody', {main: 'MailList'});
  }
});

FlowRouter.route('/mail/send', {
  name: 'sendmail',
  action() {
    this.render('AppBody', {main: 'SendMail'});
  }
});

FlowRouter.route('/mail/:_id', {
  name: 'mailview',
  action(params) {
    this.render('AppBody', {main: 'MailView'});
  }
});
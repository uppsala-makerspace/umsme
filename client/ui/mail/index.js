import './MailList';
import './SendMail';
import './MailView';

FlowRouter.route('/mail', {
  name: 'mails',
  action() {
    BlazeLayout.render('AppBody', {main: 'MailList'});
  }
});

FlowRouter.route('/mail/send', {
  name: 'sendmail',
  action() {
    BlazeLayout.render('AppBody', {main: 'SendMail'});
  }
});

FlowRouter.route('/mail/:_id', {
  name: 'mailview',
  action(params) {
    BlazeLayout.render('AppBody', {main: 'MailView'});
  }
});
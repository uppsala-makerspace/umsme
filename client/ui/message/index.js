import "./SendMessage";
import "./MessageView";

FlowRouter.route('/message/send', {
  name: 'sendmessage',
  action() {
    BlazeLayout.render('AppBody', {main: 'SendMessage'});
  }
});

FlowRouter.route('/message/:_id', {
  name: 'messageview',
  action(params) {
    BlazeLayout.render('AppBody', {main: 'MessageView'});
  }
});
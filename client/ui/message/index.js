import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import "./SendMessage";
import "./MessageView";

FlowRouter.route('/message/send', {
  name: 'sendmessage',
  action() {
    this.render('AppBody', {main: 'SendMessage'});
  }
});

FlowRouter.route('/message/:_id', {
  name: 'messageview',
  action() {
    this.render('AppBody', {main: 'MessageView'});
  }
});
import { Template } from 'meteor/templating';
import { reactRoute } from '../../react/reactRoute';
import { SendMessagePage, MessageViewPage } from '/imports/ui/messages/MessagePages';
import { MessagesFor } from '/imports/ui/messages/MessagesFor';
import '../../react/ReactSlot';

reactRoute('/message/send', 'sendmessage', SendMessagePage);
reactRoute('/message/:_id', 'messageview', MessageViewPage);

// The messages section on the member page while it is Blaze:
//   {{> ReactSlot component=messagesComponent props=(messagesToMember id)}}
Template.registerHelper('messagesComponent', () => MessagesFor);
Template.registerHelper('messagesToMember', (memberId) => ({ memberId }));

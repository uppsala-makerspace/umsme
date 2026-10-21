import { reactRoute } from '../../react/reactRoute';
import { SendMessagePage, MessageViewPage } from '/imports/ui/messages/MessagePages';

reactRoute('/message/send', 'sendmessage', SendMessagePage);
reactRoute('/message/:_id', 'messageview', MessageViewPage);


import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const messagePages = () => import('/imports/ui/messages/MessagePages');

reactRoute('/message/send', 'sendmessage', lazyPage(messagePages, 'SendMessagePage'));
reactRoute('/message/:_id', 'messageview', lazyPage(messagePages, 'MessageViewPage'));


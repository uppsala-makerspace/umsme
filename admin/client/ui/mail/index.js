import { reactRoute } from '../../react/reactRoute';
import { MailsPage, MailViewPage, SendMailPage } from '/imports/ui/mail/MailPages';

reactRoute('/mail', 'mails', MailsPage);
reactRoute('/mail/send', 'sendmail', SendMailPage);
reactRoute('/mail/:_id', 'mailview', MailViewPage);

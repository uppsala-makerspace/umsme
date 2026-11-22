import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const mailPages = () => import('/imports/ui/mail/MailPages');

reactRoute('/mail', 'mails', lazyPage(mailPages, 'MailsPage'));
reactRoute('/mail/send', 'sendmail', lazyPage(mailPages, 'SendMailPage'));
reactRoute('/mail/:_id', 'mailview', lazyPage(mailPages, 'MailViewPage'));

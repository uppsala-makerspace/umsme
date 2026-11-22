import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const remindersPage = () => import('/imports/ui/members/RemindersPage');

reactRoute('/reminders', 'reminders', lazyPage(remindersPage, 'RemindersPage'));

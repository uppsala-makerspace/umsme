import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const pendingMembersPage = () => import('/imports/ui/pending/PendingMembersPage');

reactRoute('/pending', 'pending', lazyPage(pendingMembersPage, 'PendingMembersPage'));

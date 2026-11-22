import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const lockSyncPage = () => import('/imports/ui/lock/LockSyncPage');

reactRoute('/lock', 'lock', lazyPage(lockSyncPage, 'LockSyncPage'));

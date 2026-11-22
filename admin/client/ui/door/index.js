import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const activityPage = () => import('/imports/ui/doors/ActivityPage');

reactRoute('/activity', 'activity', lazyPage(activityPage, 'ActivityPage'));
// The pages the Activity page replaced, for bookmarks.
reactRoute('/door', 'door', lazyPage(activityPage, 'DoorStatsMoved'));
reactRoute('/doorunlocks', 'doorunlocks', lazyPage(activityPage, 'DoorUnlocksMoved'));

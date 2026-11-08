import { reactRoute } from '../../react/reactRoute';
import { ActivityPage, DoorStatsMoved, DoorUnlocksMoved } from '/imports/ui/doors/ActivityPage';

reactRoute('/activity', 'activity', ActivityPage);
// The pages the Activity page replaced, for bookmarks.
reactRoute('/door', 'door', DoorStatsMoved);
reactRoute('/doorunlocks', 'doorunlocks', DoorUnlocksMoved);

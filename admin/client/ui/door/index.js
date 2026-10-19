import { reactRoute } from '../../react/reactRoute';
import { DoorStatsPage } from '/imports/ui/doors/DoorStatsPage';
import { DoorUnlockListPage } from '/imports/ui/doors/DoorUnlockListPage';

reactRoute('/door', 'door', DoorStatsPage);
reactRoute('/doorunlocks', 'doorunlocks', DoorUnlockListPage);

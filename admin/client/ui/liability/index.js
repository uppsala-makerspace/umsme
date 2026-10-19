import { reactRoute } from '../../react/reactRoute';
import { LiabilityListPage } from '/imports/ui/liability/LiabilityListPage';
import { LiabilityEditPage } from '/imports/ui/liability/LiabilityEditPage';

reactRoute('/liability', 'liability', LiabilityListPage);
reactRoute('/liability/add', 'addliability', LiabilityEditPage);
reactRoute('/liability/:_id', 'liabilityview', LiabilityEditPage);

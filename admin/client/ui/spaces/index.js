import { reactRoute } from '../../react/reactRoute';
import { SpaceListPage } from '/imports/ui/spaces/SpaceListPage';
import { SpaceEditPage } from '/imports/ui/spaces/SpaceEditPage';

reactRoute('/spaces', 'spaces', SpaceListPage);
reactRoute('/spaces/add', 'addspace', SpaceEditPage);
reactRoute('/space/:_id', 'spaceview', SpaceEditPage);

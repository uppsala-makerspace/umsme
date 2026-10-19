import { reactRoute } from '../../react/reactRoute';
import { GroupListPage } from '/imports/ui/groups/GroupListPage';
import { GroupEditPage } from '/imports/ui/groups/GroupEditPage';

reactRoute('/groups', 'groups', GroupListPage);
reactRoute('/groups/add', 'addgroup', GroupEditPage);
reactRoute('/group/:_id', 'groupview', GroupEditPage);

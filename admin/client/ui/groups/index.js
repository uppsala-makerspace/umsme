import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const groupListPage = () => import('/imports/ui/groups/GroupListPage');
const groupEditPage = () => import('/imports/ui/groups/GroupEditPage');

reactRoute('/groups', 'groups', lazyPage(groupListPage, 'GroupListPage'));
reactRoute('/groups/add', 'addgroup', lazyPage(groupEditPage, 'GroupEditPage'));
reactRoute('/group/:_id', 'groupview', lazyPage(groupEditPage, 'GroupEditPage'));

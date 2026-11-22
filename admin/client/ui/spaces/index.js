import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const spaceListPage = () => import('/imports/ui/spaces/SpaceListPage');
const spaceEditPage = () => import('/imports/ui/spaces/SpaceEditPage');

reactRoute('/spaces', 'spaces', lazyPage(spaceListPage, 'SpaceListPage'));
reactRoute('/spaces/add', 'addspace', lazyPage(spaceEditPage, 'SpaceEditPage'));
reactRoute('/space/:_id', 'spaceview', lazyPage(spaceEditPage, 'SpaceEditPage'));

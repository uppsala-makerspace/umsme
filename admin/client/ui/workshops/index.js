import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const workshopListPage = () => import('/imports/ui/workshops/WorkshopListPage');
const workshopEditPage = () => import('/imports/ui/workshops/WorkshopEditPage');

reactRoute('/workshops', 'workshops', lazyPage(workshopListPage, 'WorkshopListPage'));
reactRoute('/workshops/add', 'addworkshop', lazyPage(workshopEditPage, 'WorkshopEditPage'));
reactRoute('/workshop/:_id', 'workshopview', lazyPage(workshopEditPage, 'WorkshopEditPage'));

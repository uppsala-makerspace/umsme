import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const liabilityListPage = () => import('/imports/ui/liability/LiabilityListPage');
const liabilityEditPage = () => import('/imports/ui/liability/LiabilityEditPage');

reactRoute('/liability', 'liability', lazyPage(liabilityListPage, 'LiabilityListPage'));
reactRoute('/liability/add', 'addliability', lazyPage(liabilityEditPage, 'LiabilityEditPage'));
reactRoute('/liability/:_id', 'liabilityview', lazyPage(liabilityEditPage, 'LiabilityEditPage'));

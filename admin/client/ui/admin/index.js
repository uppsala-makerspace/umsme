import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const adminConsolePage = () => import('/imports/ui/console/AdminConsolePage');

reactRoute('/admin', 'admin', lazyPage(adminConsolePage, 'AdminConsolePage'));

import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const excludedPage = () => import('/imports/ui/members/ExcludedPage');

reactRoute('/excluded', 'excluded', lazyPage(excludedPage, 'ExcludedPage'));

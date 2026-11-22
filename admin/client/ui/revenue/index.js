import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const revenuePage = () => import('/imports/ui/stats/RevenuePage');

reactRoute('/revenue', 'revenue', lazyPage(revenuePage, 'RevenuePage'));

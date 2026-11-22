import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const historyPage = () => import('/imports/ui/stats/HistoryPage');

reactRoute('/history', 'history', lazyPage(historyPage, 'HistoryPage'));

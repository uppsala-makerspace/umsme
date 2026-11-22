import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const statisticsPage = () => import('/imports/ui/stats/StatisticsPage');

reactRoute('/stats', 'statistics', lazyPage(statisticsPage, 'StatisticsPage'));

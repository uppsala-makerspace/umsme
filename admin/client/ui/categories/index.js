import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const categoryListPage = () => import('/imports/ui/categories/CategoryListPage');

reactRoute('/categories', 'categories', lazyPage(categoryListPage, 'CategoryListPage'));

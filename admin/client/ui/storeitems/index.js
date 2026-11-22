import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const storeItemListPage = () => import('/imports/ui/storeItems/StoreItemListPage');
const storeItemEditPage = () => import('/imports/ui/storeItems/StoreItemEditPage');

reactRoute('/storeitems', 'storeitems', lazyPage(storeItemListPage, 'StoreItemListPage'));
reactRoute('/storeitems/add', 'addstoreitem', lazyPage(storeItemEditPage, 'StoreItemEditPage'));
reactRoute('/storeitem/:_id', 'storeitemview', lazyPage(storeItemEditPage, 'StoreItemEditPage'));

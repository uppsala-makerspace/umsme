import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const storagePage = () => import('/imports/ui/storage/StoragePage');

reactRoute('/storage', 'storage', lazyPage(storagePage, 'StoragePage'));

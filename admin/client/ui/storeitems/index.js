import { reactRoute } from '../../react/reactRoute';
import { StoreItemListPage } from '/imports/ui/storeItems/StoreItemListPage';
import { StoreItemEditPage } from '/imports/ui/storeItems/StoreItemEditPage';

reactRoute('/storeitems', 'storeitems', StoreItemListPage);
reactRoute('/storeitems/add', 'addstoreitem', StoreItemEditPage);
reactRoute('/storeitem/:_id', 'storeitemview', StoreItemEditPage);

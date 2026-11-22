import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const bankExportPage = () => import('/imports/ui/accounting/BankExportPage');

reactRoute('/accounting/bankexport', 'bankexport', lazyPage(bankExportPage, 'BankExportPage'));

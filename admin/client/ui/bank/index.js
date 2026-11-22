import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const paymentsPage = () => import('/imports/ui/payments/PaymentsPage');
const paymentViewPage = () => import('/imports/ui/payments/PaymentViewPage');

reactRoute('/payments', 'payments', lazyPage(paymentsPage, 'PaymentsPage'));
reactRoute('/payment/:_id', 'payment', lazyPage(paymentViewPage, 'PaymentViewPage'));

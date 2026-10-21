import { reactRoute } from '../../react/reactRoute';
import { PaymentsPage } from '/imports/ui/payments/PaymentsPage';
import { PaymentViewPage } from '/imports/ui/payments/PaymentViewPage';

reactRoute('/payments', 'payments', PaymentsPage);
reactRoute('/payment/:_id', 'payment', PaymentViewPage);

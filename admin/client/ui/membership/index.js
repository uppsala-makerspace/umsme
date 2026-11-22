import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const membershipPages = () => import('/imports/ui/payments/MembershipPages');

reactRoute('/memberships/add', 'addmembership', lazyPage(membershipPages, 'MembershipAddPage'));
reactRoute('/membership/:_id', 'memberview', lazyPage(membershipPages, 'MembershipViewPage'));

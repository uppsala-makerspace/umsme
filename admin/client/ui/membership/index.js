import { reactRoute } from '../../react/reactRoute';
import { MembershipAddPage, MembershipViewPage } from '/imports/ui/payments/MembershipPages';

reactRoute('/memberships/add', 'addmembership', MembershipAddPage);
reactRoute('/membership/:_id', 'memberview', MembershipViewPage);

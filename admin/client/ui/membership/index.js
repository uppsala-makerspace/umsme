import { reactRoute } from '../../react/reactRoute';
import { MembershipAddPage, MembershipViewPage } from '/imports/ui/payments/MembershipPages';
import '../comment';

reactRoute('/memberships/add', 'addmembership', MembershipAddPage);
reactRoute('/membership/:_id', 'memberview', MembershipViewPage);

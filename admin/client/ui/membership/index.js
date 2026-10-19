import { reactRoute } from '../../react/reactRoute';
import { MembershipAddPage, MembershipViewPage } from '/imports/ui/payments/MembershipPages';
import '../message/InitiateMessage';
import '../message/MessageList';
import '../comment';
import './MembershipList';

reactRoute('/memberships/add', 'addmembership', MembershipAddPage);
reactRoute('/membership/:_id', 'memberview', MembershipViewPage);

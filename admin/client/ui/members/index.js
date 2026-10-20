import { reactRoute } from '../../react/reactRoute';
import { MembersPage, MemberAddPage, MemberViewPage, FamilyAddPage } from '/imports/ui/members/MemberPages';

reactRoute('/members', 'members', MembersPage);
reactRoute('/members/add', 'addmember', MemberAddPage);
reactRoute('/member/:_id', 'memberview', MemberViewPage);
reactRoute('/member/:_id/add', 'familymemberadd', FamilyAddPage);

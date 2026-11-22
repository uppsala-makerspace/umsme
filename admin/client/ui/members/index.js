import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const memberPages = () => import('/imports/ui/members/MemberPages');

reactRoute('/members', 'members', lazyPage(memberPages, 'MembersPage'));
reactRoute('/members/add', 'addmember', lazyPage(memberPages, 'MemberAddPage'));
reactRoute('/member/:_id', 'memberview', lazyPage(memberPages, 'MemberViewPage'));
reactRoute('/member/:_id/add', 'familymemberadd', lazyPage(memberPages, 'FamilyAddPage'));

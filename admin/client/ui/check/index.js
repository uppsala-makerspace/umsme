import { reactRoute } from '../../react/reactRoute';
import { FindStatusPage } from '/imports/ui/check/FindStatusPage';
import { MemberStatusPage } from '/imports/ui/check/MemberStatusPage';
import '../../layouts/Clean.html';

reactRoute('/check', 'check', FindStatusPage, { layout: 'Clean' });
reactRoute('/check/:_id', 'memberview', MemberStatusPage, { layout: 'Clean' });

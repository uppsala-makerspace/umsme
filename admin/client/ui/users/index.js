import { reactRoute } from '../../react/reactRoute';
import { UsersPage, UserAddPage, UserViewPage } from '/imports/ui/users/UserPages';

reactRoute('/users', 'users', UsersPage);
reactRoute('/users/add', 'usersadd', UserAddPage);
reactRoute('/user/:_id', 'userview', UserViewPage);

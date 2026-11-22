import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const userPages = () => import('/imports/ui/users/UserPages');

reactRoute('/users', 'users', lazyPage(userPages, 'UsersPage'));
reactRoute('/users/add', 'usersadd', lazyPage(userPages, 'UserAddPage'));
reactRoute('/user/:_id', 'userview', lazyPage(userPages, 'UserViewPage'));

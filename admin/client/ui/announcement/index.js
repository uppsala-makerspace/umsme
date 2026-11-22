import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const announcementListPage = () => import('/imports/ui/announcements/AnnouncementListPage');
const announcementEditPage = () => import('/imports/ui/announcements/AnnouncementEditPage');

reactRoute('/announcements', 'announcements', lazyPage(announcementListPage, 'AnnouncementListPage'));
reactRoute('/announcements/new', 'announcementNew', lazyPage(announcementEditPage, 'AnnouncementEditPage'));
reactRoute('/announcement/:_id', 'announcementView', lazyPage(announcementEditPage, 'AnnouncementEditPage'));
reactRoute('/announcement/:_id/edit', 'announcementEdit', lazyPage(announcementEditPage, 'AnnouncementEditPage'));

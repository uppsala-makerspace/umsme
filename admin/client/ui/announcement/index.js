import { reactRoute } from '../../react/reactRoute';
import { AnnouncementListPage } from '/imports/ui/announcements/AnnouncementListPage';
import { AnnouncementEditPage } from '/imports/ui/announcements/AnnouncementEditPage';

reactRoute('/announcements', 'announcements', AnnouncementListPage);
reactRoute('/announcements/new', 'announcementNew', AnnouncementEditPage);
reactRoute('/announcement/:_id', 'announcementView', AnnouncementEditPage);
reactRoute('/announcement/:_id/edit', 'announcementEdit', AnnouncementEditPage);

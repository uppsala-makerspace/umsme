import { reactRoute } from '../../react/reactRoute';
import { WorkshopListPage } from '/imports/ui/workshops/WorkshopListPage';
import { WorkshopEditPage } from '/imports/ui/workshops/WorkshopEditPage';

reactRoute('/workshops', 'workshops', WorkshopListPage);
reactRoute('/workshops/add', 'addworkshop', WorkshopEditPage);
reactRoute('/workshop/:_id', 'workshopview', WorkshopEditPage);

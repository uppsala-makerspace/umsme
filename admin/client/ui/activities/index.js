import { reactRoute } from '../../react/reactRoute';
import {
  ActivityListPage, ActivityEditPage, EventListPage, EventEditPage, CalendarImportPage,
} from '/imports/ui/activities/ActivityPages';

reactRoute('/activities', 'activities', ActivityListPage);
reactRoute('/activities/add', 'addactivity', ActivityEditPage);
reactRoute('/activity/:_id', 'activityview', ActivityEditPage);
reactRoute('/events', 'events', EventListPage);
reactRoute('/events/add', 'addevent', EventEditPage);
reactRoute('/events/import', 'importevents', CalendarImportPage);
reactRoute('/event/:_id', 'eventview', EventEditPage);

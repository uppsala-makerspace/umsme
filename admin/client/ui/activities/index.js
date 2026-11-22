import { reactRoute, lazyPage } from '../../react/reactRoute';

// Each page is loaded when first shown (lazyPage).
const activityPages = () => import('/imports/ui/activities/ActivityPages');

reactRoute('/activities', 'activities', lazyPage(activityPages, 'ActivityListPage'));
reactRoute('/activities/add', 'addactivity', lazyPage(activityPages, 'ActivityEditPage'));
reactRoute('/activity/:_id', 'activityview', lazyPage(activityPages, 'ActivityEditPage'));
reactRoute('/events', 'events', lazyPage(activityPages, 'EventListPage'));
reactRoute('/events/add', 'addevent', lazyPage(activityPages, 'EventEditPage'));
reactRoute('/events/import', 'importevents', lazyPage(activityPages, 'CalendarImportPage'));
reactRoute('/event/:_id', 'eventview', lazyPage(activityPages, 'EventEditPage'));

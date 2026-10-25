import { fn } from 'storybook/test';
import { CalendarImport } from './CalendarImport';

const at = (d, h) => new Date(2026, 10, d, h, 0);
const items = [
  { googleEventId: 'g1', name: 'Öppen kväll', location: 'Stora rummet', start: at(3, 18), end: at(3, 21), allDay: false, eventId: 'e1', activityId: 'a1', activityName: { sv: 'Öppen kväll' } },
  { googleEventId: 'g2', name: 'Öppen kväll', location: 'Stora rummet', start: at(10, 18), end: at(10, 21), allDay: false, eventId: null, activityId: 'a1', activityName: { sv: 'Öppen kväll' } },
  { googleEventId: 'g3', name: 'Städdag i lokalen', location: '', start: at(12, 10), end: at(12, 15), allDay: false, eventId: null, activityId: null },
  { googleEventId: 'g4', name: 'Makermässa', location: '', start: at(20, 0), end: at(21, 0), allDay: true, eventId: null, activityId: null },
];

export default {
  title: 'Activities/CalendarImport',
  component: CalendarImport,
  args: {
    configured: true, from: '2026-08-01', to: '2027-04-30', onFrom: fn(), onTo: fn(), onFetch: fn(), onImport: fn(),
    items, chosen: ['g2', 'g3'], onChoose: fn(),
  },
};

export const Fetched = {};
export const BeforeFetching = { args: { items: null, chosen: [] } };
export const NotConfigured = { args: { configured: false, items: null, chosen: [] } };

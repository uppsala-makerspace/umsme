import { fn } from 'storybook/test';
import { StorageEventLog } from './StorageEventLog';
import { storyMembers, storyUnits } from './fixtures';

const rows = [
  { _id: 'e1', occurred_at: new Date(), eventLabel: 'Warning sent', entityLabel: 'Assignment', ownerIds: ['m1'], memberLabel: 'Vera Varnad', unitLabel: '1002', actorLabel: 'System', reason: 'Lab membership ended', detailsLabel: 'deadline: 2026-11-15' },
  { _id: 'e2', occurred_at: new Date(Date.now() - 86400000), eventLabel: 'Request created', entityLabel: 'Request', ownerIds: ['m3'], memberLabel: 'Kim Kö', unitLabel: '—', actorLabel: 'Lars Lagerhållare', reason: '' },
];

export default {
  title: 'Storage/StorageEventLog',
  component: StorageEventLog,
  args: { rows, members: storyMembers, units: storyUnits, filters: {}, onFilter: fn(), onClear: fn() },
};

export const Events = {};
export const NoMatches = { args: { rows: [] } };

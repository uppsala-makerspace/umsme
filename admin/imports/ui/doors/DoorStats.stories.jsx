import { fn } from 'storybook/test';
import { DoorStats } from './DoorStats';

export default {
  title: 'Doors/DoorStats',
  component: DoorStats,
  args: { onCheck: fn() },
};

export const Start = {};
export const FromTheLock = { args: { source: 'lock', visits: { labels: ['1-5', '6-10', '11-20', '21-50', '50-?'], counts: [41, 18, 12, 6, 2] } } };
export const Counting = { args: { busy: true } };

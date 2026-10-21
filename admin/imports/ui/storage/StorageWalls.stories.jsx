import { fn } from 'storybook/test';
import { StorageWalls } from './StorageWalls';
import { storyWalls, storyUnits } from './fixtures';

export default {
  title: 'Storage/StorageWalls',
  component: StorageWalls,
  args: { walls: storyWalls, unitCount: (id) => storyUnits.filter((u) => u.wall_id === id).length, onCreate: fn(), onUpdate: fn() },
};

export const Walls = {};
export const Inactive = { args: { walls: [...storyWalls, { _id: 'w3', name: 'Old shelf', floor: 'floor1', display_order: 3, column_count: 1, row_count: 1, active: false }] } };

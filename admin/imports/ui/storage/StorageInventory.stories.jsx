import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { StorageInventory } from './StorageInventory';
import { storyGroupedWalls, storyWalls } from './fixtures';

const Selectable = (props) => {
  const [selected, setSelected] = useState('u1002');
  const [filters, setFilters] = useState({});
  return <StorageInventory {...props} selectedId={selected} onSelect={setSelected} filters={filters} onFilter={(f, v) => setFilters((c) => ({ ...c, [f]: v }))} />;
};

export default {
  title: 'Storage/StorageInventory',
  component: StorageInventory,
  render: (args) => <Selectable {...args} />,
  args: { walls: storyGroupedWalls, wallOptions: storyWalls, activeWalls: storyWalls, onCreate: fn() },
};

export const Walls = {};
export const Refused = { args: { error: 'Position column 2, row 1 is already taken' } };

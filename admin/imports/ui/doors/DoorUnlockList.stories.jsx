import React, { useState } from 'react';
import { DoorUnlockList } from './DoorUnlockList';

const rows = [
  { _id: 'u1', timestamp: new Date(2026, 9, 19, 18, 4), door: 'outerDoor', method: 'app', memberid: 'm1', memberName: 'Maja Medlem' },
  { _id: 'u2', timestamp: new Date(2026, 9, 18, 9, 30), door: 'outerDoor', method: 'danalock', extid: 'user-guest-gast@example.org', memberName: null },
  { _id: 'u3', timestamp: new Date(2026, 9, 17, 20, 12), door: 'outerDoor', method: 'danalock', memberid: 'm2', memberName: 'Dagny Rabatt' },
];

const Paged = (props) => {
  const [query, setQuery] = useState({ page: 0, pageSize: 25, sort: { field: 'timestamp', direction: 'desc' }, search: '' });
  const [showNames, setShowNames] = useState(props.showNames);
  return <DoorUnlockList {...props} query={query} onQueryChange={setQuery} showNames={showNames} onShowNamesChange={setShowNames} />;
};

export default {
  title: 'Doors/DoorUnlockList',
  component: DoorUnlockList,
  render: (args) => <Paged {...args} />,
  args: { rows, total: rows.length, loading: false, showNames: false },
};

export const Openings = {};
export const WithNames = { args: { showNames: true } };

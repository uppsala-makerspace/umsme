import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { StorageActions } from './StorageActions';

const preview = {
  generated_at: new Date(),
  rows: [
    { suggestion_id: 's1', action: 'allocate', member_name: 'Kim Kö', unit_name: '1004', reason_code: 'oldest_compatible_without_storage', phase: 1, relevant_dates: { requested_at: new Date(Date.now() - 30 * 86400000) }, expected_channels: { email: 'available' } },
    { suggestion_id: 's2', action: 'allocate', decision_type: 'move', member_name: 'Mona Flytt', unit_name: '2001', reason_code: 'oldest_compatible_move', relevant_dates: { requested_at: new Date(Date.now() - 12 * 86400000) } },
  ],
};
const previews = { allocate: preview, warn: { rows: [] }, remind: { rows: [] }, reclaim: { rows: [] }, release: { rows: [] }, review_expired_offers: { rows: [] }, confirm_clearance: { rows: [] } };

const Interactive = (props) => {
  const [open, setOpen] = useState(props.open);
  const [selected, setSelected] = useState({});
  const [options, setOptions] = useState({});
  return (
    <StorageActions {...props} open={open} onOpen={setOpen} onClose={() => setOpen('')} preview={open ? previews[open] : null}
      selected={selected} onSelect={(id, on) => setSelected((s) => ({ ...s, [id]: on }))}
      onSelectAll={(on) => setSelected(on ? {} : { s1: false, s2: false })}
      options={options} onOption={(id, c) => setOptions((o) => ({ ...o, [id]: { ...(o[id] || {}), ...c } }))} />
  );
};

export default {
  title: 'Storage/StorageActions',
  component: StorageActions,
  render: (args) => <Interactive {...args} />,
  args: { previews, onConfirm: fn() },
};

export const Cards = {};
export const Assignments = { args: { open: 'allocate' } };
export const Confirmed = {
  args: { open: 'allocate', results: [{ suggestion_id: 's1', status: 'applied', statusLabel: 'Applied', label: 'Kim Kö · 1004' }, { suggestion_id: 's2', status: 'stale', statusLabel: 'Needs review', label: 'Mona Flytt · 2001', reason: 'The unit was taken meanwhile.' }] },
};

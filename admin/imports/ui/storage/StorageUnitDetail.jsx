import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { storageStatusLabel } from '/imports/storage/presentation';
import { StorageMemberPicker } from './StorageMemberPicker';
import { dateTime } from '../dates';

const native = { select: { native: true }, inputLabel: { shrink: true } };
const moment = (value) => dateTime(value) || '—';
const Sub = ({ title, children }) => (
  <Box sx={{ mt: 2, p: 2, border: 1, borderColor: 'divider', bgcolor: '#fafafa' }}>
    <Typography variant="h6" component="h3" sx={{ mb: 1 }}>{title}</Typography>
    {children}
  </Box>
);

/** The unit's physical metadata: name, wall, column, row, status, note. */
const Metadata = ({ unit, walls, busy, onSave }) => {
  const [values, setValues] = useState({});
  useEffect(() => {
    setValues({ name: unit.name, wall_id: unit.wall_id, column: unit.column, row: unit.row, availability_status: unit.availability_status, note: unit.note || '', acknowledged: false });
  }, [unit._id, unit.updatedAt?.getTime?.()]);
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  const lifecycle = !['available', 'unavailable'].includes(unit.availability_status);
  const protectedUnit = ['occupied', 'reserved'].includes(unit.availability_status);
  return (
    <Box component="form" sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 1.5, my: 1.5 }}
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          name: values.name, wall_id: values.wall_id, column: Number(values.column), row: Number(values.row),
          availability_status: values.availability_status, note: values.note || null,
        }, values.acknowledged);
      }}>
      <TextField label="Name" required value={values.name || ''} onChange={set('name')} />
      <TextField label="Height" value={unit.height || ''} slotProps={{ input: { readOnly: true }, inputLabel: { shrink: true } }} />
      <TextField label="Wall" select required slotProps={native} value={values.wall_id || ''} onChange={set('wall_id')}>
        {walls.map((w) => <option key={w._id} value={w._id} disabled={!w.active && w._id !== unit.wall_id}>{w.name}{w.active ? '' : ' (inactive)'}</option>)}
      </TextField>
      <TextField label="Column" type="number" required slotProps={{ htmlInput: { min: 1 } }} value={values.column ?? ''} onChange={set('column')} />
      <TextField label="Row" type="number" required slotProps={{ htmlInput: { min: 1 } }} value={values.row ?? ''} onChange={set('row')} />
      <TextField label="Unit status" select slotProps={native} value={values.availability_status || ''} onChange={set('availability_status')}>
        <option value="available">Available</option>
        <option value="unavailable">Unavailable</option>
        {lifecycle && <option value={unit.availability_status}>{storageStatusLabel(unit.availability_status)} (unchanged)</option>}
      </TextField>
      <TextField label="Internal note" multiline minRows={2} value={values.note || ''} onChange={set('note')} sx={{ gridColumn: '1 / -1' }} />
      {protectedUnit && (
        <Box sx={{ gridColumn: '1 / -1', p: 1.5, borderLeft: 4, borderColor: '#b64b00', bgcolor: '#fff0df' }}>
          <FormControlLabel label={`I confirm these physical metadata changes for this ${storageStatusLabel(unit.availability_status)} unit.`}
            control={<Checkbox checked={!!values.acknowledged} onChange={(e) => setValues((v) => ({ ...v, acknowledged: e.target.checked }))} />} />
          <Typography variant="caption" sx={{ display: 'block' }}>Required because the unit is part of an active assignment or pending move.</Typography>
        </Box>
      )}
      <Box><Button type="submit" variant="contained" disabled={busy}>Save metadata</Button></Box>
    </Box>
  );
};

const ManualAssign = ({ members, busy, onAssign }) => {
  const [ownerId, setOwnerId] = useState(null);
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <Stack component="form" direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 2, p: 2, border: 1, borderColor: 'divider', bgcolor: '#fafafa', alignItems: { md: 'center' } }}
      onSubmit={(e) => { e.preventDefault(); if (ownerId) onAssign({ owner_id: ownerId, override, reason: reason || undefined }); }}>
      <StorageMemberPicker label="Assign manually to member" members={members} value={ownerId} onChange={setOwnerId} required />
      <FormControlLabel label="override queue/eligibility" control={<Checkbox checked={override} onChange={(e) => setOverride(e.target.checked)} />} />
      <TextField label="Reason when overriding" value={reason} onChange={(e) => setReason(e.target.value)} />
      <Button type="submit" variant="contained" color="warning" disabled={busy || !ownerId}>Assign — no automatic notification</Button>
    </Stack>
  );
};

/**
 * One storage unit: its metadata, and what can be done with it now:
 * clearance, manual assignment, return, exemption, release, its owner's
 * request and offer, the storage messages and the history.
 *
 * @param {{ unit: object, ownerName: string, walls: object[], members: object[], request?: object,
 *           offer?: object, messages: object[], history: object[], canRequestRelease: boolean,
 *           busy?: boolean, error?: string, on: object }} props
 *   `request` with canTogglePause and pauseTarget; `on` holds the actions: saveMetadata,
 *   confirmClearance, assign, markReturned, createExemption, revokeExemption, requestRelease,
 *   togglePause, cancelRequest, completeOffer, extendOffer, cancelOffer.
 */
export const StorageUnitDetail = ({
  unit, ownerName, walls, members, request, offer, messages, history, canRequestRelease, busy = false, error, on,
}) => (
  <Paper component="section" variant="outlined" sx={{ mt: 3, p: 2 }}>
    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="h5" component="h2">Unit {unit.name}</Typography>
        <Typography variant="body2" color="text.secondary">{storageStatusLabel(unit.availability_status)} · {ownerName}</Typography>
      </Box>
      {unit.owner && <Button href={`/member/${unit.owner}`}>Open member</Button>}
    </Stack>
    {error && <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>}
    <Alert severity="info" sx={{ my: 1.5 }}>
      <strong>No automatic notification.</strong> Every manual unit, assignment, exemption, move, and clearance action in this section is internal; contact the member separately when needed.
    </Alert>
    <Metadata unit={unit} walls={walls} busy={busy} onSave={on.saveMetadata} />
    {unit.availability_status === 'awaiting_clearance' && (
      <Button variant="contained" color="warning" disabled={busy} onClick={on.confirmClearance}>Confirm physical clearance</Button>
    )}
    {unit.availability_status === 'available' && <ManualAssign members={members} busy={busy} onAssign={on.assign} />}
    {unit.availability_status === 'occupied' && (
      <Sub title="Current occupancy">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2">Assigned {moment(unit.assigned_at)}.</Typography>
          <Button size="small" color="error" variant="outlined" disabled={busy} onClick={on.markReturned}>Mark returned</Button>
        </Stack>
        {unit.exemption
          ? <Typography variant="body2" sx={{ mt: 1 }}>Exempt: {unit.exemption.reason} <Button size="small" disabled={busy} onClick={on.revokeExemption}>Revoke</Button></Typography>
          : <Button size="small" variant="outlined" sx={{ mt: 1 }} disabled={busy} onClick={on.createExemption}>Add exemption</Button>}
      </Sub>
    )}
    {canRequestRelease && <Button sx={{ mt: 2 }} variant="outlined" color="warning" disabled={busy} onClick={on.requestRelease}>Request release — no automatic notification</Button>}
    {request && (
      <Sub title="Active request">
        <Typography variant="body2">{request.request_type} · {request.request_status} · {moment(request.requested_at)}</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          {request.canTogglePause && <Button size="small" variant="outlined" disabled={busy} onClick={() => on.togglePause(request)}>{request.request_status === 'waiting' ? 'Pause as ineligible' : 'Resume'}</Button>}
          <Button size="small" color="error" disabled={busy} onClick={() => on.cancelRequest(request)}>Cancel</Button>
        </Stack>
      </Sub>
    )}
    {offer && (
      <Sub title="Pending storage offer">
        <Typography variant="body2">Deadline {moment(offer.deadline_at)}</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button size="small" variant="contained" disabled={busy} onClick={() => on.completeOffer(offer)}>Complete</Button>
          <Button size="small" variant="outlined" disabled={busy} onClick={() => on.extendOffer(offer)}>Extend</Button>
          <Button size="small" color="error" disabled={busy} onClick={() => on.cancelOffer(offer)}>Cancel</Button>
        </Stack>
      </Sub>
    )}
    <Sub title="Storage messages">
      {messages.length
        ? <Box component="ul" sx={{ m: 0 }}>{messages.map((m) => <li key={m._id}>{moment(m.senddate)} · {m.subject}</li>)}</Box>
        : <Typography variant="body2">No automatic storage messages recorded for this owner.</Typography>}
    </Sub>
    <Sub title="History">
      {history.length
        ? <Box component="ol" sx={{ m: 0, maxHeight: '22rem', overflowY: 'auto' }}>{history.map((h) => <li key={h._id}><time>{moment(h.occurred_at)}</time> <strong>{h.event_type}</strong> {h.reason}</li>)}</Box>
        : <Typography variant="body2">No recorded events.</Typography>}
    </Sub>
  </Paper>
);

import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { StorageMemberPicker } from './StorageMemberPicker';
import { day, dateTime } from '../dates';
import { DateField } from '../components/DateField';

const native = { select: { native: true }, inputLabel: { shrink: true } };
const shownDay = (value) => day(value) || '—';

/**
 * Add a member to the queue, ask for a different unit, or edit a request:
 * the preferred floor and height, and, with a reason, a corrected waiting date.
 *
 * @param {{ editor: { mode: 'add'|'move'|'edit', request?: object, memberName?: string },
 *           members: object[], busy?: boolean, onSave: (values) => void, onClose: () => void }} props
 */
const RequestEditor = ({ editor, members, busy, onSave, onClose }) => {
  const { request } = editor;
  const type = request?.request_type || (editor.mode === 'move' ? 'move' : 'allocation');
  const [values, setValues] = useState({});
  useEffect(() => {
    setValues({ ownerId: request?.owner || null, floor: request?.preference?.floor || '', height: request?.preference?.height || '', requestedAt: '', reason: '' });
  }, [request?._id, editor.mode]);
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }));
  const title = request ? 'Edit request' : type === 'move' ? 'Request a different unit' : 'Add a member to the queue';
  const description = request
    ? 'Update what this member prefers without changing their place in the queue. Expand Advanced to correct the waiting date.'
    : type === 'move' ? 'For a member who already has storage and wants a better match.' : 'For an eligible member who does not currently have storage.';
  const submit = request ? 'Save changes' : type === 'move' ? 'Request different unit' : 'Add to queue';
  const reasonMissing = values.requestedAt && !values.reason?.trim();
  return (
    <Paper variant="outlined" component="form" sx={{ p: 2, mt: 2, bgcolor: '#f7fafc' }}
      onSubmit={(e) => { e.preventDefault(); if (!reasonMissing) onSave({ ...values, requestType: type, requestId: request?._id }); }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" component="h3">{title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>
        </Box>
        <Button onClick={onClose}>Close</Button>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        {request
          ? <TextField label="Member" value={editor.memberName || ''} disabled sx={{ minWidth: 280 }} />
          : <StorageMemberPicker label="Member" members={members} value={values.ownerId} onChange={(id) => setValues((v) => ({ ...v, ownerId: id }))} required />}
        <TextField label="Preferred floor" select slotProps={native} value={values.floor || ''} onChange={set('floor')} sx={{ minWidth: 160 }}>
          <option value="">Any floor</option><option value="floor1">Floor 1</option><option value="floor2">Floor 2</option>
        </TextField>
        <TextField label="Preferred height" select slotProps={native} value={values.height || ''} onChange={set('height')} sx={{ minWidth: 160 }}>
          <option value="">Any height</option><option value="low">Low</option><option value="high">High</option>
        </TextField>
      </Stack>
      {request && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          Current waiting date: <strong title={dateTime(request.requested_at)}>{shownDay(request.requested_at)}</strong>. Saving preferences alone preserves it.
        </Typography>
      )}
      <Box component="details" sx={{ mb: 2, p: 1.5, border: 1, borderColor: 'divider', bgcolor: 'background.paper', '& summary': { cursor: 'pointer', fontWeight: 700 } }}>
        <summary>Advanced: correct waiting date</summary>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
          <DateField label="Corrected waiting date" value={values.requestedAt || ''} onChange={(v) => set('requestedAt')({ target: { value: v } })} />
          <TextField label="Reason" fullWidth required={!!values.requestedAt} value={values.reason || ''} onChange={set('reason')}
            placeholder="Why is the waiting date being corrected?" slotProps={{ htmlInput: { maxLength: 5000 } }}
            error={!!reasonMissing} helperText={reasonMissing ? 'A reason is required when correcting the waiting date.' : ''} />
        </Stack>
      </Box>
      <Button type="submit" variant="contained" color="warning" disabled={busy || (!request && !values.ownerId)}>{submit} — no automatic notification</Button>
    </Paper>
  );
};

/**
 * The storage queue: active requests for a unit or a different unit, oldest
 * first, searchable, with editing, pausing and cancelling, and the editor
 * for adding or changing a request.
 *
 * @param {{ rows: object[], query: string, onQueryChange: (q) => void, error?: string, busy?: boolean,
 *           editor?: object, onOpenEditor: (editor) => void, onCloseEditor: () => void, onSaveRequest: (values) => void,
 *           onTogglePause: (row) => void, onCancel: (row) => void, members: object[] }} props
 */
export const StorageQueue = ({
  rows, query, onQueryChange, error, busy = false, editor, onOpenEditor, onCloseEditor, onSaveRequest, onTogglePause, onCancel, members,
}) => (
  <Paper component="section" variant="outlined" sx={{ mt: 3, p: 2 }}>
    <Stack direction={{ xs: 'column', md: 'row' }} sx={{ justifyContent: 'space-between', gap: 1 }}>
      <Box>
        <Typography variant="h5" component="h2">Storage queue</Typography>
        <Typography variant="body2" color="text.secondary">Active allocation and different-unit requests, oldest first.</Typography>
      </Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Button variant="contained" onClick={() => onOpenEditor({ mode: 'add' })}>Add to queue</Button>
        <Button variant="outlined" onClick={() => onOpenEditor({ mode: 'move' })}>Request different unit</Button>
      </Stack>
    </Stack>
    {error && <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>}
    <Alert severity="info" sx={{ my: 1.5 }}><strong>No automatic notification.</strong> These manual request changes are audited, but administrators must contact the member separately.</Alert>
    <TextField type="search" size="small" label="Search queue members" placeholder="Name, member number, or email" value={query}
      onChange={(e) => onQueryChange(e.target.value)} sx={{ mb: 1.5, minWidth: 320 }} />
    {rows.length === 0 ? <Typography>No members are currently waiting for storage.</Typography> : (
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>Member</TableCell><TableCell>Waiting since</TableCell><TableCell>Request</TableCell><TableCell>Current unit</TableCell><TableCell>Preferences</TableCell><TableCell>Eligibility</TableCell><TableCell>Queue status</TableCell><TableCell>Actions</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row._id}>
                <TableCell><strong>{row.memberName}</strong>{row.memberNumber && <><br /><small>{row.memberNumber}</small></>}</TableCell>
                <TableCell title={dateTime(row.requested_at)}>{shownDay(row.requested_at)}</TableCell>
                <TableCell>{row.requestLabel}</TableCell>
                <TableCell>{row.currentUnit}</TableCell>
                <TableCell>{row.preferenceLabel}</TableCell>
                <TableCell><Typography variant="body2" color={row.eligibilityLabel === 'Eligible' ? 'success.dark' : 'error.main'}>{row.eligibilityLabel}</Typography></TableCell>
                <TableCell>{row.pauseLabel}</TableCell>
                <TableCell>
                  {row.editable ? (
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" variant="outlined" onClick={() => onOpenEditor({ mode: 'edit', requestId: row._id })}>Edit request</Button>
                      {row.canTogglePause && <Button size="small" variant="outlined" onClick={() => onTogglePause(row)}>{row.pauseActionLabel}</Button>}
                      <Button size="small" color="error" onClick={() => onCancel(row)}>Cancel</Button>
                    </Stack>
                  ) : <small>Assignment in progress</small>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    )}
    {editor && <RequestEditor editor={editor} members={members} busy={busy} onSave={onSaveRequest} onClose={onCloseEditor} />}
  </Paper>
);

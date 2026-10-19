import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { STORAGE_ACTIONS, storageActionReasonLabel, storageResultSummary } from '/imports/storage/presentation';

const moment = (value) => (value ? new Date(value).toLocaleString() : '—');
const RESULT_COLOR = { applied: 'success.main', already_applied: 'success.main', stale: 'warning.dark', conflict: 'warning.dark', failed: 'error.main' };

const channels = (row) => (['allocate', 'warn', 'remind', 'reclaim', 'release'].includes(row.action)
  ? (row.expected_channels?.email === 'available' ? 'Email + app message' : 'App message only')
  : 'No automatic message');

/** What a row of a preview needs decided before it can be confirmed, if anything. */
const Decision = ({ row, option, onOption }) => (
  <Stack spacing={0.5}>
    <span>{channels(row)}</span>
    {row.action === 'allocate' && row.decision_type === 'move' && (
      <FormControlLabel label="inspect old unit" control={(
        <Checkbox size="small" checked={!!option.requires_inspection} onChange={(e) => onOption({ requires_inspection: e.target.checked })} />
      )} />
    )}
    {row.action === 'review_expired_offers' && (
      <TextField select size="small" label="Decision" value={option.resolution || ''} onChange={(e) => onOption({ resolution: e.target.value })}
        slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}>
        <option value="">Choose…</option>
        <option value="extend">Extend 14 days</option>
        <option value="complete">Complete</option>
        <option value="cancel">Cancel</option>
      </TextField>
    )}
    {row.action === 'reclaim' && (
      <Box sx={{ p: 1, bgcolor: '#fff4dd', borderLeft: 3, borderColor: '#d98200' }}>
        <strong>{row.warning_delivered ? 'Warning delivered' : 'No delivered warning'}</strong>
        {row.manual_contact_required && (
          <>
            <FormControlLabel label="I contacted this member manually" control={(
              <Checkbox size="small" checked={!!option.manual_contact_confirmed} onChange={(e) => onOption({ manual_contact_confirmed: e.target.checked })} />
            )} />
            <TextField size="small" fullWidth placeholder="How and when was contact made?" value={option.manual_contact_reason || ''}
              onChange={(e) => onOption({ manual_contact_reason: e.target.value })} slotProps={{ htmlInput: { maxLength: 5000 } }} />
          </>
        )}
      </Box>
    )}
  </Stack>
);

/**
 * The suggested storage actions as cards with how many each would affect,
 * and the preview of one: its rows, which to include, what each needs
 * decided, and the results once confirmed.
 *
 * @param {{ previews: object, busy?: boolean, open?: string, onOpen: (action) => void, onClose: () => void,
 *           preview?: object, selected: object, options: object, onSelect: (id, on) => void,
 *           onSelectAll: (on) => void, onOption: (id, changes) => void, onConfirm: () => void,
 *           error?: string, results?: object[] }} props
 *   `selected` holds false for the rows left out; `options` each row's decisions.
 */
export const StorageActions = ({
  previews, busy = false, open, onOpen, onClose, preview, selected, options, onSelect, onSelectAll, onOption, onConfirm, error, results,
}) => {
  const rows = preview?.rows || [];
  const included = rows.filter((r) => selected[r.suggestion_id] !== false);
  const confirmable = !busy && included.length > 0 && !included.some((r) => r.manual_contact_required
    && (options[r.suggestion_id]?.manual_contact_confirmed !== true || !options[r.suggestion_id]?.manual_contact_reason?.trim()));
  const title = STORAGE_ACTIONS.find((a) => a.id === open)?.label;
  return (
    <Box component="section" sx={{ mt: 3 }}>
      <Typography variant="h5" component="h2">Suggested actions</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Nothing is changed or sent until you review and confirm a batch.</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 1.5 }}>
        {STORAGE_ACTIONS.map((card) => (
          <Paper key={card.id} variant="outlined" sx={{ bgcolor: open === card.id ? 'action.selected' : '#f5f9fb' }}>
            <ButtonBase onClick={() => onOpen(card.id)} disabled={busy || previews[card.id]?.blocked}
              sx={{ width: '100%', p: 1.5, justifyContent: 'space-between', textAlign: 'left', alignItems: 'flex-start' }}>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{card.label}</Typography>
                <Typography variant="body2" color="text.secondary">{card.help}</Typography>
              </Box>
              <Chip size="small" label={previews[card.id]?.rows?.length ?? '…'} sx={{ bgcolor: 'grey.800', color: 'common.white', fontWeight: 700 }} />
            </ButtonBase>
          </Paper>
        ))}
      </Box>

      {open && (
        <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="h5" component="h2">{title}</Typography>
              <Typography variant="body2" color="text.secondary">Preview generated {moment(preview?.generated_at)}. Uncheck rows to exclude them.</Typography>
            </Box>
            <Button onClick={onClose}>Close</Button>
          </Stack>
          {error && <Alert severity="error" sx={{ my: 1 }}>{error}</Alert>}
          {preview?.blocked && <Alert severity="warning" sx={{ my: 1 }}>Blocked by allocation readiness. Resolve the listed issues and refresh.</Alert>}
          {!rows.length ? <Typography sx={{ my: 2 }}>No actions are currently suggested.</Typography> : (
            <>
              <Stack direction="row" spacing={1} sx={{ my: 1 }}>
                <Button size="small" variant="outlined" onClick={() => onSelectAll(true)}>Select all</Button>
                <Button size="small" variant="outlined" onClick={() => onSelectAll(false)}>Deselect all</Button>
              </Stack>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Include</TableCell><TableCell>Member</TableCell><TableCell>Unit</TableCell><TableCell>Reason</TableCell><TableCell>Date</TableCell><TableCell>Message / decision</TableCell></TableRow></TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.suggestion_id}>
                        <TableCell padding="checkbox">
                          <Checkbox size="small" checked={selected[row.suggestion_id] !== false} onChange={(e) => onSelect(row.suggestion_id, e.target.checked)}
                            slotProps={{ input: { 'aria-label': `Include ${row.member_name || ''} ${row.unit_name || ''}` } }} />
                        </TableCell>
                        <TableCell>{row.member_name}</TableCell>
                        <TableCell>{row.unit_name}</TableCell>
                        <TableCell>{storageActionReasonLabel(row.reason_code)}{row.phase ? ` (phase ${row.phase})` : ''}</TableCell>
                        <TableCell>{moment(row.relevant_dates?.deadline_at || row.relevant_dates?.requested_at || row.relevant_dates?.warned_at)}</TableCell>
                        <TableCell><Decision row={row} option={options[row.suggestion_id] || {}} onOption={(changes) => onOption(row.suggestion_id, changes)} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ mt: 2, p: 1.5, bgcolor: '#eef4f7', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', bottom: 0 }}>
            <Typography variant="body2">{included.length} selected. A fresh preview is checked before confirmation.</Typography>
            <Button variant="contained" disabled={!confirmable} onClick={onConfirm}>Confirm selected</Button>
          </Stack>
          {results && (
            <Box aria-live="polite" sx={{ mt: 2 }}>
              <Typography variant="h6" component="h3">Batch results</Typography>
              <Typography sx={{ fontWeight: 700 }}>{storageResultSummary(results)}</Typography>
              <Box component="ul">
                {results.map((r) => (
                  <Box component="li" key={r.suggestion_id} sx={{ color: RESULT_COLOR[r.status] }}><strong>{r.statusLabel}</strong> {r.label} {r.reason}</Box>
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

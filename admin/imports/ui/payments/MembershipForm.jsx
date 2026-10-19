import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { fieldOptions } from '/imports/common/lib/modelOptions';
import { day } from './labels';

const native = { select: { native: true }, inputLabel: { shrink: true } };
const TYPES = fieldOptions('membership', 'type');

/**
 * Add a membership for a member, from its start and amount (the rules work
 * out the rest), or correct one by hand: every field, saved with Save,
 * after which the member's dates follow.
 *
 * @param {{ isNew: boolean, member: { _id, name }, membership?: object, values: object, onChange: (field, value) => void,
 *           onSave: () => void, busy?: boolean, error?: string, dependents?: string[], payment?: object,
 *           onDelete?: () => void, after?: React.ReactNode }} props
 *   `dependents` lose access if the family box is unticked; `after` holds the messages and comments.
 */
export const MembershipForm = ({ isNew, member, membership, values, onChange, onSave, busy = false, error, dependents = [], payment, onDelete, after }) => {
  const [confirming, setConfirming] = useState(false);
  const text = (name) => ({ value: values[name] ?? '', onChange: (e) => onChange(name, e.target.value) });
  const date = (name, label) => <TextField label={label} type="date" {...text(name)} slotProps={{ inputLabel: { shrink: true } }} />;
  const losing = !isNew && membership?.family && !values.family && dependents.length > 0;
  return (
    <Box sx={{ maxWidth: 900 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          {isNew ? 'Add membership for member ' : 'Membership for '}<Link href={`/member/${member._id}`}>{member.name}</Link>
        </Typography>
        {!isNew && <Button color="error" variant="outlined" disabled={busy} onClick={() => setConfirming(true)}>Delete membership</Button>}
      </Stack>
      {isNew && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>The type, family, discount and end dates follow from the amount and start, by the same rules as a payment in the app.</Typography>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField label="Amount" type="number" required {...text('amount')} />
          {date('start', 'Start')}
        </Stack>
        {!isNew && (
          <>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <TextField label="Type" select slotProps={native} {...text('type')} sx={{ minWidth: 200 }}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </TextField>
              {date('memberend', 'Membership end')}
              {date('labend', 'Lab membership end')}
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
              <FormControlLabel label="Discount" control={<Checkbox checked={!!values.discount} onChange={(e) => onChange('discount', e.target.checked)} />} />
              <FormControlLabel label="Family" control={<Checkbox checked={!!values.family} onChange={(e) => onChange('family', e.target.checked)} />} />
            </Stack>
            {losing && <Alert severity="warning" sx={{ mb: 2 }}>The following family members will lose access immediately: {dependents.join(', ')}</Alert>}
          </>
        )}
        <Stack direction="row" spacing={1}>
          <Button type="submit" variant="contained" disabled={busy}>{isNew ? 'Add membership' : 'Save'}</Button>
          <Button href={`/member/${member._id}`}>Cancel</Button>
        </Stack>
      </Box>
      {payment && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" component="h2"><Link href={`/payment/${payment._id}`}>Bank payment</Link></Typography>
          <Typography variant="body2">{payment.type} · {payment.amount} kr · {day(payment.date)}{payment.message ? ` · ${payment.message}` : ''}</Typography>
        </Box>
      )}
      {after}
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Delete this membership?</DialogTitle>
        <DialogContent><DialogContentText>The membership is deleted and the member&apos;s dates follow; its payment stays with the member.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { setConfirming(false); onDelete(); }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

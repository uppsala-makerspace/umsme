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
import { DateField } from '../components/DateField';
import { memberPath, membershipPath } from '../members/paths';
import { FORM_WIDTH, PageTabs, TabPanel } from '../components/PageTabs';

const native = { select: { native: true }, inputLabel: { shrink: true } };
const TYPES = fieldOptions('membership', 'type');
const TABS = [['details', 'Details'], ['messages', 'Messages'], ['comments', 'Comments']];

/**
 * Add a membership for a member, from its start and amount (the rules work
 * out the rest), or correct one by hand: every field, saved with Save,
 * after which the member's dates follow. An existing membership shows its
 * bank payment above tabs for its details, messages and comments; every tab
 * stays put while another shows, so unsaved details survive.
 *
 * @param {{ isNew: boolean, member: { _id, name }, membership?: object, values: object, onChange: (field, value) => void,
 *           onSave: () => void, busy?: boolean, error?: string, notice?: string, dependents?: string[], payment?: object,
 *           onDelete?: () => void, tab?: string, onTab?: (tab) => void, counts?: { messages?, comments? },
 *           messages?: React.ReactNode, comments?: React.ReactNode }} props
 *   `dependents` lose access if the family box is unticked.
 */
export const MembershipForm = ({ isNew, member, membership, values, onChange, onSave, busy = false, error, notice, dependents = [], payment, onDelete, tab = 'details', onTab, counts = {}, messages, comments }) => {
  const [confirming, setConfirming] = useState(false);
  const text = (name) => ({ value: values[name] ?? '', onChange: (e) => onChange(name, e.target.value) });
  const date = (name, label) => <DateField label={label} value={values[name] ?? ''} onChange={(v) => onChange(name, v)} />;
  const losing = !isNew && membership?.family && !values.family && dependents.length > 0;
  const shown = TABS.some(([t]) => t === tab) ? tab : 'details';
  const form = (
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
        <Button href={memberPath(member._id, 'memberships')}>Cancel</Button>
      </Stack>
    </Box>
  );
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          {isNew ? 'Add membership for member ' : 'Membership for '}<Link href={memberPath(member._id, 'memberships')}>{member.name}</Link>
        </Typography>
        {!isNew && <Button color="error" variant="outlined" disabled={busy} onClick={() => setConfirming(true)}>Delete membership</Button>}
      </Stack>
      {isNew && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>The type, family, discount and end dates follow from the amount and start, by the same rules as a payment in the app.</Typography>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}
      {isNew ? <Box sx={{ maxWidth: FORM_WIDTH }}>{form}</Box> : (
        <>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {payment
              ? <>Bank payment: <Link href={`/payment/${payment._id}`}>{payment.type} · {payment.amount} kr · {day(payment.date)}</Link>{payment.message ? ` · ${payment.message}` : ''}</>
              : <Typography component="span" variant="body2" color="text.secondary">No bank payment</Typography>}
          </Typography>
          <PageTabs tabs={TABS.map(([value, label]) => ({ value, label, count: counts[value] }))} value={shown} onChange={onTab} href={(t) => membershipPath(membership._id, t)} />
          <TabPanel value="details" shown={shown} label="Details" form>{form}</TabPanel>
          <TabPanel value="messages" shown={shown} label="Messages">{messages}</TabPanel>
          <TabPanel value="comments" shown={shown} label="Comments" form>{comments}</TabPanel>
        </>
      )}
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

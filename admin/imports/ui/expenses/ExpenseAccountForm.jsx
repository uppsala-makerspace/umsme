import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ChipSelect } from '../components/ChipSelect';
import { Section } from '../components/Section';
import { kr } from './labels';
import { DateField } from '../components/DateField';
import { groupPath } from '../groups/paths';

const native = { select: { native: true }, inputLabel: { shrink: true } };

const Links = ({ label, items }) => (items.length > 0 && (
  <Typography variant="body2" sx={{ mt: 0.5 }}>
    {label}:{' '}
    {items.map((item, i) => <React.Fragment key={item.href}>{i > 0 && ', '}<Link href={item.href}>{item.label}</Link></React.Fragment>)}
  </Typography>
));

/** Set or revise a year's budget, and the entries so far. */
const Budget = ({ year, years, onYear, revisions, busy, onAdd, onRemove, today, canEdit }) => {
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState(today);
  const [comment, setComment] = useState('');
  const [removing, setRemoving] = useState(null);
  const current = revisions[0];
  return (
    <Section title="Budget" note="The budget for a calendar year. An expense counts towards the year of its receipt date. Revising adds a new entry; earlier ones are kept as history. Admin, board and treasurer may set it.">
      <TextField label="Year" select slotProps={native} value={year} onChange={(e) => onYear(Number(e.target.value))} sx={{ mb: 2, minWidth: 140 }}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </TextField>
      {current
        ? <Typography sx={{ fontSize: '1.6rem', mb: 1 }}><strong>{kr(current.amount)}</strong> <Typography component="span" color="text.secondary">in force since {current.dateText}</Typography></Typography>
        : <Typography sx={{ mb: 1 }}><em>No budget set for {year}.</em></Typography>}
      {canEdit && (
        <Stack component="form" direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ my: 2, alignItems: { md: 'flex-start' } }}
          onSubmit={(e) => { e.preventDefault(); onAdd({ amount, day, comment }, () => { setAmount(''); setComment(''); }); }}>
          <TextField label="Budget (kr)" type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} />
          <DateField label="Date" required value={day} onChange={setDay} />
          <TextField label={current ? 'Comment (required)' : 'Comment'} required={!!current} multiline value={comment} onChange={(e) => setComment(e.target.value)} sx={{ flex: 1 }} />
          <Button type="submit" variant="contained" disabled={busy}>{current ? 'Revise' : 'Set'}</Button>
        </Stack>
      )}
      {revisions.length > 0 && (
        <Table size="small">
          <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Budget</TableCell><TableCell>Comment</TableCell><TableCell>Set by</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {revisions.map((r, i) => (
              <TableRow key={r._id} selected={i === 0}>
                <TableCell>{r.dateText}</TableCell>
                <TableCell>{kr(r.amount)}</TableCell>
                <TableCell>{r.comment}</TableCell>
                <TableCell>{r.setBy ? <Link href={`/member/${r.setBy}`}>{r.setByName}</Link> : <em>admin</em>}</TableCell>
                <TableCell align="right">{canEdit && <Button size="small" color="error" disabled={busy} onClick={() => setRemoving(r)}>Remove</Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={!!removing} onClose={() => setRemoving(null)}>
        <DialogTitle>Remove this budget entry?</DialogTitle>
        <DialogContent><DialogContentText>If it is the budget in force, the entry before it takes over again.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoving(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => { onRemove(removing._id); setRemoving(null); }}>Remove</Button>
        </DialogActions>
      </Dialog>
    </Section>
  );
};

/**
 * Add an expense account, or show and edit one: name, explanation, object
 * codes, groups, approver groups and approvers, saved with Save; then its
 * budget, which takes effect at once.
 *
 * @param {{ isNew: boolean, account?: object, values: object, onChange: (field, value) => void, onSave: () => void,
 *           busy?: boolean, error?: string, notice?: string, canEdit: boolean,
 *           groups: Array<{ _id, name }>, dimensions: Array<{ nr, name, suggestions: string[] }>,
 *           choices?: { candidates: object[], activeCounts: object, approverGroupMembers: string[] },
 *           use?: { expenses: number, budgets: number }, onDelete?: () => void, budget?: object,
 *           memberName?: (memberId) => string }} props
 *   `choices` answers for the groups in `values`; `budget` holds Budget's props.
 */
export const ExpenseAccountForm = ({
  isNew, account, values, onChange, onSave, busy = false, error, notice, canEdit, groups, dimensions, choices, use, onDelete, budget, memberName = () => null,
}) => {
  const [confirming, setConfirming] = useState(false);
  const text = (name) => ({ value: values[name], onChange: (e) => onChange(name, e.target.value) });
  const groupOptions = groups.map((g) => ({ value: g._id, label: g.name?.sv || g._id }));
  const groupName = (id) => groups.find((g) => g._id === id)?.name?.sv || id;
  const candidates = choices?.candidates || [];
  const eligible = new Set(candidates.map((c) => c._id));
  // Removing a group can cost approvers: they must be active members of the account's groups.
  const lost = choices ? values.approverMemberIds.filter((id) => !eligible.has(id)) : [];
  const nameOf = (id) => candidates.find((c) => c._id === id)?.name || memberName(id) || id;
  const approverPeople = new Set([...values.approverMemberIds.filter((id) => eligible.has(id) || !choices), ...(choices?.approverGroupMembers || [])]);
  const used = use && (use.expenses > 0 || use.budgets > 0);
  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Link href="/expenses/accounts" underline="hover" variant="body2">← Expense accounts</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 2 }}>
        <Typography variant="h4" component="h1">{isNew ? 'Add expense account' : `Expense account: ${account.name}`}</Typography>
        {!isNew && canEdit && use && !used && <Button color="error" variant="outlined" onClick={() => setConfirming(true)}>Delete account</Button>}
      </Stack>
      {!isNew && used && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This account is used by {[use.expenses && `${use.expenses} expense(s)`, use.budgets && 'a budget'].filter(Boolean).join(' and ')} and can no longer be deleted.
        </Alert>
      )}
      {!canEdit && <Alert severity="info" sx={{ mb: 2 }}>Admin and board change the account; you may set its budget.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      <Box component="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <TextField label="Name" required disabled={!canEdit} {...text('name')} />
          <TextField label="Explanation" required multiline minRows={3} disabled={!canEdit} {...text('explanation')} />
        </Stack>
        {dimensions.length > 0 && (
          <>
            <Typography variant="subtitle1" component="h2" sx={{ mb: 0.5 }}>Dimensions</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Optional object code per dimension (used to tag bookkeeping entries).</Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
              {dimensions.map((d) => (
                <Autocomplete key={d.nr} freeSolo options={d.suggestions} disabled={!canEdit} sx={{ flex: 1 }}
                  value={values.dimensions[d.nr] || ''} inputValue={values.dimensions[d.nr] || ''}
                  onInputChange={(e, v) => onChange('dimensions', { ...values.dimensions, [d.nr]: v })}
                  renderInput={(params) => <TextField {...params} label={`${d.name} (dim ${d.nr})`} placeholder="Object (optional)" />} />
              ))}
            </Stack>
          </>
        )}
        <Typography variant="subtitle1" component="h2" sx={{ mb: 1 }}>Groups</Typography>
        <Box sx={{ mb: 2 }}>
          <ChipSelect label="Groups" options={groupOptions} value={values.groupIds} disabled={!canEdit} onChange={(ids) => onChange('groupIds', ids)}
            helperText="The groups this account belongs to; their members may make expenses on it, and approvers are picked from them." />
          <Links label="Open" items={values.groupIds.map((id) => ({ href: groupPath(id, 'references'), label: groupName(id) }))} />
          {values.groupIds.length === 0 && <Alert severity="warning" sx={{ mt: 1 }}>No group selected: the guideline requires every account to belong to at least one group.</Alert>}
        </Box>
        <Typography variant="subtitle1" component="h2" sx={{ mb: 0.5 }}>Expense approvers</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Who may approve expenses on this account in the app (the guideline requires at least two): members picked among the active members of the
          account&apos;s groups, or whole groups, whose active members may all approve. Admin, board and treasurer may always approve.
        </Typography>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Box>
            <ChipSelect label="Approver groups" options={groupOptions} value={values.approverGroupIds} disabled={!canEdit} onChange={(ids) => onChange('approverGroupIds', ids)}
              helperText={values.approverGroupIds.length ? values.approverGroupIds.map((id) => `${groupName(id)}: ${choices?.activeCounts?.[id] ?? '…'} active`).join(' · ') : 'Any group, not only the account’s own.'} />
          </Box>
          <Box>
            <ChipSelect label="Approvers" disabled={!canEdit}
              options={candidates.map((c) => ({ value: c._id, label: c.name, group: c.groups.join(', ') }))
                .concat(values.approverMemberIds.filter((id) => !eligible.has(id)).map((id) => ({ value: id, label: nameOf(id) })))}
              value={values.approverMemberIds} onChange={(ids) => onChange('approverMemberIds', ids)}
              helperText={values.groupIds.length ? 'Active members of the account’s groups.' : 'Add a group above before adding approvers.'} />
            <Links label="Open" items={values.approverMemberIds.map((id) => ({ href: `/member/${id}`, label: nameOf(id) }))} />
            {lost.length > 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                Not active members of the account&apos;s groups, so saving removes {lost.length === 1 ? 'this approver' : 'these approvers'}: <strong>{lost.map(nameOf).join(', ')}</strong>.
              </Alert>
            )}
            {choices && approverPeople.size < 2 && (
              <Alert severity="warning" sx={{ mt: 1 }}>Fewer than two people can approve on this account, counting both individual approvers and the active members of approver groups. The guideline requires at least two.</Alert>
            )}
          </Box>
        </Stack>
        {canEdit && (
          <Stack direction="row" spacing={1}>
            <Button type="submit" variant="contained" disabled={busy}>{isNew ? 'Add expense account' : 'Save'}</Button>
            <Button href="/expenses/accounts">{isNew ? 'Cancel' : 'Back'}</Button>
          </Stack>
        )}
      </Box>

      {!isNew && budget && <Budget {...budget} busy={busy} />}

      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Delete this expense account?</DialogTitle>
        <DialogContent><DialogContentText>“{account?.name}” is deleted for good.</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} onClick={() => { setConfirming(false); onDelete(); }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

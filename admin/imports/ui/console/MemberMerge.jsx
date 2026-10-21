import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Section } from '../components/Section';

const Side = ({ title, member }) => (
  <Box sx={{ flex: 1 }}>
    <Typography variant="subtitle1" component="h3">{title}: <Link href={`/member/${member._id}`}>{member.name}</Link> <Typography component="span" variant="body2" color="text.secondary">{member.mid}</Typography></Typography>
    <Typography variant="body2">{member.email}</Typography>
    <Box component="ul" sx={{ pl: 2.5, my: 0.5 }}>
      {member.memberships.length === 0
        ? <Typography component="li" variant="body2" color="text.secondary">No memberships</Typography>
        : member.memberships.map((ms) => <Typography component="li" variant="body2" key={ms._id}>{ms.type} {ms.start} – {ms.end}</Typography>)}
    </Box>
  </Box>
);

const Rows = ({ rows }) => (
  <Table size="small" sx={{ width: 'auto', mb: 2 }}>
    <TableBody>{rows.map(([a, b]) => <TableRow key={a}><TableCell>{a}</TableCell><TableCell align="right">{b}</TableCell></TableRow>)}</TableBody>
  </Table>
);

/**
 * Merging two members: the numbers, a preview of what moves and what is
 * filled in, then the merge itself, asked once more.
 *
 * @param {{ plan: object|null, done: object|null, busy?: boolean, error?: string,
 *           onPreview: (sourceMid, destMid) => void, onMerge: (sourceMid, destMid) => void, onEdit: () => void }} props
 *   `plan` and `done` as members.mergePreview and members.merge return them.
 */
export const MemberMerge = ({ plan, done, busy = false, error, onPreview, onMerge, onEdit }) => {
  const [sourceMid, setSourceMid] = useState('');
  const [destMid, setDestMid] = useState('');
  const [confirming, setConfirming] = useState(false);
  const edit = (set) => (e) => { set(e.target.value); setConfirming(false); onEdit(); };
  return (
    <Section title="Merge members" note="Moves everything that refers to the source member (memberships, payments, messages, door unlocks, attestations, group memberships, storage, …) to the destination member, then deletes the source. Year of birth, gender, mobile, RFID and bank details the destination lacks are taken from the source, as are a later liability date and board acceptance. Anything else on the source member itself is lost; move it to the destination yourself first.">
      <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'flex-start', mb: 2 }}
        onSubmit={(e) => { e.preventDefault(); setConfirming(false); onPreview(sourceMid.trim(), destMid.trim()); }}>
        <TextField size="small" label="Source member number (deleted)" value={sourceMid} onChange={edit(setSourceMid)} />
        <TextField size="small" label="Destination member number (kept)" value={destMid} onChange={edit(setDestMid)} />
        <Button type="submit" variant="outlined" disabled={busy || !sourceMid.trim() || !destMid.trim()}>Preview</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {plan && (
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 2 }}>
            <Side title="Source" member={plan.source} />
            <Side title="Destination" member={plan.dest} />
          </Stack>
          <Typography variant="subtitle1" component="h3">Moved to the destination</Typography>
          {plan.moves.length ? <Rows rows={plan.moves.map((m) => [m.label, m.count])} /> : <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Nothing refers to the source member.</Typography>}
          {plan.copies.length > 0 && <><Typography variant="subtitle1" component="h3">Filled in on the destination</Typography><Rows rows={plan.copies.map((c) => [c.label, c.shown])} /></>}
          {plan.blockers.map((b) => <Alert key={b} severity="error" sx={{ mb: 1 }}>{b}</Alert>)}
          {plan.warnings.map((w) => <Alert key={w} severity="warning" sx={{ mb: 1 }}>{w}</Alert>)}
          {plan.blockers.length === 0 && (confirming
            ? <Stack direction="row" spacing={1}><Button variant="contained" color="error" disabled={busy} onClick={() => onMerge(sourceMid.trim(), destMid.trim())}>Yes, merge and delete {plan.source.mid}</Button><Button disabled={busy} onClick={() => setConfirming(false)}>Cancel</Button></Stack>
            : <Button variant="contained" onClick={() => setConfirming(true)}>Merge</Button>)}
        </Box>
      )}
      {done && (
        <Alert severity="success">
          Merged {done.source.mid} ({done.source.name}) into <Link href={`/member/${done.dest._id}`}>{done.dest.name} ({done.dest.mid})</Link>.
        </Alert>
      )}
    </Section>
  );
};

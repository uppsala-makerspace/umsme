import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Section } from '../components/Section';
import { Rows } from '../console/MemberMerge';

const Emails = ({ emails }) => (
  <Box component="ul" sx={{ pl: 2.5, my: 0.5 }}>
    {emails.map((e) => (
      <Typography component="li" variant="body2" key={e.address}>
        {e.address}{!e.verified && <Typography component="span" variant="body2" color="text.secondary"> (not verified)</Typography>}
      </Typography>
    ))}
  </Box>
);

const Account = ({ title, account }) => (
  <Box sx={{ flex: 1 }}>
    <Typography variant="subtitle1" component="h3">{title}</Typography>
    <Emails emails={account.emails} />
    <Typography variant="body2">Signs in with: {account.logins.join(', ') || 'nothing'}</Typography>
    {account.roles.length > 0 && <Typography variant="body2">Roles: {account.roles.join(', ')}</Typography>}
    <Typography variant="body2">
      Member: {account.member ? <Link href={`/member/${account.member._id}`}>{account.member.name} ({account.member.mid})</Link> : 'none'}
    </Typography>
  </Box>
);

/**
 * Merging another account into this one: its address, a preview of both
 * accounts, what the kept one gets and what moves, and, when the two find
 * different members, which member to keep and what merging them moves. Then
 * the merge, asked once more.
 *
 * @param {{ plan: object|null, done: object|null, busy?: boolean, error?: string,
 *           onPreview: (address, keptMemberId?) => void, onMerge: (address, keptMemberId?) => void, onEdit: () => void }} props
 *   `plan` and `done` as users.mergePreview and users.merge return them.
 */
export const UserMerge = ({ plan, done, busy = false, error, onPreview, onMerge, onEdit }) => {
  const [address, setAddress] = useState('');
  const [confirming, setConfirming] = useState(false);
  const keptMemberId = plan?.members?.keptMemberId || null;
  const memberPlan = plan?.members?.plan;
  return (
    <Section title="Merge another account into this one" note="For one person with two accounts. This account gets the other one's addresses (verified if verified on either), its Google login and sessions, push subscriptions and roles; its password stays, and the other account is deleted. If the two accounts find different members, those are merged too.">
      <Stack component="form" direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'flex-start', mb: 2 }}
        onSubmit={(e) => { e.preventDefault(); setConfirming(false); onPreview(address.trim()); }}>
        <TextField size="small" label="Email of the other account (deleted)" value={address} sx={{ minWidth: 320 }}
          onChange={(e) => { setAddress(e.target.value); setConfirming(false); onEdit(); }} />
        <Button type="submit" variant="outlined" disabled={busy || !address.trim()}>Preview</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {plan && (
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 2 }}>
            <Account title="This account (kept)" account={plan.kept} />
            <Account title="The other account (deleted)" account={plan.removed} />
          </Stack>
          <Typography variant="subtitle1" component="h3">This account afterwards</Typography>
          <Emails emails={plan.emails} />
          <Typography variant="body2" sx={{ mb: 2 }}>Signs in with: {plan.logins.join(', ')}</Typography>
          {plan.moves.length > 0 && <><Typography variant="subtitle1" component="h3">Moved to this account</Typography><Rows rows={plan.moves.map((m) => [m.label, m.count])} /></>}
          {memberPlan && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" component="h3">The members</Typography>
              <RadioGroup value={keptMemberId} onChange={(e) => { setConfirming(false); onPreview(address.trim(), e.target.value); }}>
                {[memberPlan.dest, memberPlan.source].sort((a, b) => String(a.mid).localeCompare(String(b.mid))).map((m) => (
                  <FormControlLabel key={m._id} value={m._id} control={<Radio size="small" />} disabled={busy}
                    label={`Keep ${m.name} (${m.mid}, ${m.email}): ${m.memberships.length} membership${m.memberships.length === 1 ? '' : 's'}`} />
                ))}
              </RadioGroup>
              <Typography variant="body2" sx={{ mt: 1 }}>Moved from {memberPlan.source.name} ({memberPlan.source.mid}), who is deleted:</Typography>
              {memberPlan.moves.length ? <Rows rows={memberPlan.moves.map((m) => [m.label, m.count])} /> : <Typography variant="body2" color="text.secondary">Nothing refers to that member.</Typography>}
              {memberPlan.copies.length > 0 && <Rows rows={memberPlan.copies.map((c) => [c.label, c.shown])} />}
              {memberPlan.warnings.map((w) => <Alert key={w} severity="warning" sx={{ mb: 1 }}>{w}</Alert>)}
            </Box>
          )}
          {plan.blockers.map((b) => <Alert key={b} severity="error" sx={{ mb: 1 }}>{b}</Alert>)}
          {plan.warnings.map((w) => <Alert key={w} severity="warning" sx={{ mb: 1 }}>{w}</Alert>)}
          {plan.blockers.length === 0 && (confirming
            ? (
              <Stack direction="row" spacing={1}>
                <Button variant="contained" color="error" disabled={busy} onClick={() => onMerge(address.trim(), keptMemberId)}>
                  Yes, merge and delete {plan.removed.emails[0]?.address || plan.removed.username}
                </Button>
                <Button disabled={busy} onClick={() => setConfirming(false)}>Cancel</Button>
              </Stack>
            )
            : <Button variant="contained" onClick={() => setConfirming(true)}>Merge</Button>)}
        </Box>
      )}
      {done && (
        <Alert severity="success">
          Merged {done.removed.emails.map((e) => e.address).join(', ') || done.removed.username} into this account
          {done.members ? `, and member ${done.members.plan.source.mid} into ${done.members.plan.dest.mid}` : ''}.
        </Alert>
      )}
    </Section>
  );
};

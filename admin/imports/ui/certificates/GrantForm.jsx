import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { MemberSelect } from '../components/MemberSelect';
import { today, daysAfter } from './format';

const native = { select: { native: true }, inputLabel: { shrink: true } };

/**
 * Grant a certificate: to a member chosen here (on a certificate's page), or
 * a certificate chosen here (on a member's page). The certifier starts as
 * the logged-in member. Without an end date, the certificate's default
 * validity sets one.
 *
 * @param {{ choose: 'member'|'certificate', certificates?: Array<{ value, label, validityDays? }>,
 *           validityDays?: number, search: (query) => Promise<object[]>,
 *           defaultCertifier?: { _id, name, mid }|null, onGrant: (grant) => Promise<any>, busy?: boolean }} props
 *   `onGrant` gets { memberId | certificateId, certifierId, startDay, endDay, comment } and
 *   resolves to whether it was granted; the form empties only then.
 */
export const GrantForm = ({ choose, certificates = [], validityDays, search, defaultCertifier = null, onGrant, busy = false }) => {
  const [member, setMember] = useState(null);
  const [certificateId, setCertificateId] = useState('');
  const [certifier, setCertifier] = useState(defaultCertifier);
  const [startDay, setStartDay] = useState(today);
  const [endDay, setEndDay] = useState('');
  const [comment, setComment] = useState('');
  useEffect(() => { if (!certifier && defaultCertifier) setCertifier(defaultCertifier); }, [defaultCertifier?._id]);

  const days = choose === 'certificate' ? certificates.find((c) => c.value === certificateId)?.validityDays : validityDays;
  const ready = (choose === 'member' ? member : certificateId) && certifier && startDay;
  const grant = async () => {
    const done = await onGrant({
      ...(choose === 'member' ? { memberId: member._id } : { certificateId }),
      certifierId: certifier._id, startDay, endDay, comment,
    });
    if (!done) return;
    setMember(null);
    setCertificateId('');
    setEndDay('');
    setComment('');
  };

  return (
    <Box component="form" onSubmit={(e) => { e.preventDefault(); if (ready) grant(); }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          {choose === 'member'
            ? <MemberSelect label="Member" value={member} onChange={setMember} search={search} />
            : (
              <TextField label="Certificate" select fullWidth slotProps={native} value={certificateId} onChange={(e) => setCertificateId(e.target.value)}>
                <option value="">(Choose a certificate)</option>
                {certificates.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </TextField>
            )}
        </Box>
        <Box sx={{ flex: 1 }}>
          <MemberSelect label="Certified by" value={certifier} onChange={setCertifier} search={search} />
        </Box>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Start date" type="date" required value={startDay} onChange={(e) => setStartDay(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 180 }} />
        <TextField label="End date" type="date" value={endDay} onChange={(e) => setEndDay(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 180 }}
          helperText={days ? `Empty: ${daysAfter(startDay || today(), days)} (${days} days)` : 'Empty: no expiry'} />
        <TextField label="Comment" fullWidth value={comment} onChange={(e) => setComment(e.target.value)} />
      </Stack>
      <Button type="submit" variant="contained" disabled={!ready || busy}>Grant certificate</Button>
      {!certifier && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Choose who certifies.</Typography>}
    </Box>
  );
};

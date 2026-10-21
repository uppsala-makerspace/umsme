import React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { reminderDays } from '/imports/common/lib/rules';

const day = (date) => (date ? new Date(date).toLocaleDateString('sv-SE') : '');
const DAY = 86400000;

/** Green while far off, amber in the reminder window, red once passed. */
const endColor = (end, now) => (end > new Date(now.getTime() + reminderDays * DAY) ? 'success' : end > now ? 'warning' : 'error');

/**
 * A member's dates and family standing as chips, or, when the stored dates
 * have drifted from the memberships, that and a button to put them right.
 *
 * @param {{ member: object, inconsistent?: boolean, now?: Date, onRefresh?: () => void, busy?: boolean }} props
 *   `member` with its reminderState.
 */
export const MemberStatusChips = ({ member, inconsistent = false, now = new Date(), onRefresh, busy = false }) => {
  if (inconsistent) {
    return (
      <Alert severity="error" sx={{ mb: 1 }} action={<Button color="inherit" size="small" disabled={busy} onClick={onRefresh}>Update dates</Button>}>
        Dates in member profile is not in sync with membership records.
      </Alert>
    );
  }
  const reminder = !member.infamily && member.reminderState && member.reminderState !== 'none' && member.reminderState !== 'overdue'
    ? (member.reminderState === 'needed' ? { label: 'Reminder needed', color: 'error' } : { label: `Reminder sent: ${day(member.reminder)}`, color: member.reminderState === 'done' ? 'success' : 'default' })
    : null;
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }}>
      {member.member && <Chip size="small" color={endColor(new Date(member.member), now)} label={`Member to: ${day(member.member)}`} />}
      {member.lab && <Chip size="small" color={endColor(new Date(member.lab), now)} label={`Labmember to: ${day(member.lab)}`} />}
      {reminder && <Chip size="small" color={reminder.color} label={reminder.label} />}
      {member.family && !member.infamily && <Chip size="small" label="Paying familymember" />}
      {member.infamily && <Chip size="small" label="Familymember" />}
    </Stack>
  );
};


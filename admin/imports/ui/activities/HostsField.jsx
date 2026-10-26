import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { RemoveIcon } from '../components/ChipSelect';
import { MemberSelect } from '../components/MemberSelect';

/**
 * An event's hosts: those chosen, each with a cross to remove; the group's
 * active members to pick from with a click, as the app offers them; and,
 * since board and admin may choose anyone, a search for any member.
 *
 * @param {{ hosts: Array<{ _id, name, mid }>, groupMembers: Array<{ _id, name, mid }>|null, groupName?: string,
 *           onAdd: (member) => void, onRemove: (memberId) => void, search: (query) => Promise<object[]>,
 *           href?: (member) => string }} props
 *   `groupMembers` is null for an event of the association, which has no group.
 */
export const HostsField = ({ hosts, groupMembers, groupName, onAdd, onRemove, search, href }) => {
  const [picking, setPicking] = useState(null);
  const chosen = new Set(hosts.map((h) => h._id));
  return (
    <Box>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
        {hosts.length === 0 && <Typography variant="body2" color="text.secondary">No hosts yet.</Typography>}
        {hosts.map((m) => (
          <Chip key={m._id} label={m.name}
            {...(href ? { component: 'a', href: href(m), clickable: true } : {})}
            // The cross sits inside the link: keep its click from following it.
            onDelete={(event) => { event.preventDefault(); onRemove(m._id); }}
            deleteIcon={<RemoveIcon titleAccess={`Remove ${m.name}`} />} />
        ))}
      </Stack>
      {groupMembers && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            From {groupName || 'the group'}: its active members, as the app offers them
          </Typography>
          {groupMembers.length === 0 ? (
            <Typography variant="body2" color="text.secondary">The group has no active members.</Typography>
          ) : (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }} role="group" aria-label={`Members of ${groupName || 'the group'}`}>
              {groupMembers.map((m) => (
                <Chip key={m._id} label={m.name} variant={chosen.has(m._id) ? 'filled' : 'outlined'} color={chosen.has(m._id) ? 'primary' : 'default'}
                  aria-pressed={chosen.has(m._id)} clickable
                  onClick={() => (chosen.has(m._id) ? onRemove(m._id) : onAdd(m))} />
              ))}
            </Stack>
          )}
        </Box>
      )}
      <Box sx={{ mb: 2 }}>
        <MemberSelect
          label="Add any member" value={picking} search={search}
          helperText="Board and admin may choose anyone, from any group or none."
          onChange={(member) => {
            if (member && !chosen.has(member._id)) onAdd(member);
            setPicking(null);
          }}
        />
      </Box>
    </Box>
  );
};

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { RemoveIcon } from './ChipSelect';
import { MemberSelect } from './MemberSelect';

/**
 * Pick several members: the picked ones as pills, each with a cross to remove
 * it, and a search field to add one more. Like ChipSelect, but the members
 * are looked up with `search` rather than all offered at once.
 *
 * @param {{ label: string, members: Array<{ _id, name, mid }>, onAdd: (member) => void,
 *           onRemove: (memberId) => void, search: (query) => Promise<object[]>,
 *           href?: (member) => string, empty?: string, helperText?: string }} props
 *   With `href`, each pill links to the member's page.
 */
export const MemberChips = ({ label, members, onAdd, onRemove, search, href, empty = 'Nobody yet.', helperText }) => {
  const [picking, setPicking] = useState(null);
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{label}</Typography>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mb: 1 }}>
        {members.length === 0 && <Typography variant="body2" color="text.secondary">{empty}</Typography>}
        {members.map((m) => (
          <Chip key={m._id} size="small" label={m.name}
            {...(href ? { component: 'a', href: href(m), clickable: true } : {})}
            // The cross sits inside the link: keep its click from following it.
            onDelete={(event) => { event.preventDefault(); onRemove(m._id); }}
            deleteIcon={<RemoveIcon titleAccess={`Remove ${m.name}`} />} />
        ))}
      </Stack>
      <MemberSelect
        label={`Add to ${label.toLowerCase()}`} value={picking} search={search} helperText={helperText}
        onChange={(member) => {
          if (member && !members.some((m) => m._id === member._id)) onAdd(member);
          setPicking(null);
        }}
      />
    </Box>
  );
};

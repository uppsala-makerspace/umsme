import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { linkColumn } from '../components/columns';
import { TEMPLATE_TYPES, MEMBERSHIP_TYPES, MEMBER_TYPES } from '/imports/common/lib/messageTemplates';

const labels = (options) => Object.fromEntries(options.map(({ value, label }) => [value, label]));
const typeLabels = labels(TEMPLATE_TYPES);
const membershipLabels = labels(MEMBERSHIP_TYPES);
const memberLabels = labels(MEMBER_TYPES);

const columns = [
  linkColumn('name', 'Template name', (template) => `/template/${template._id}`),
  { field: 'type', headerName: 'Message type', width: 190, valueGetter: (value) => typeLabels[value] || value },
  { field: 'membershiptype', headerName: 'Membership type', width: 160, valueGetter: (value) => membershipLabels[value || ''] },
  { field: 'membertype', headerName: 'Member type', width: 130, valueGetter: (value) => memberLabels[value || ''] },
  { field: 'auto', headerName: 'Automatic', type: 'boolean', width: 110 },
  { field: 'deprecated', headerName: 'Deprecated', type: 'boolean', width: 110 },
];

/** The message templates. Mail and app messages pick among those not deprecated. */
export const MessageTemplateList = ({ loading, templates }) => (
  <Box>
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Typography variant="h4" component="h1">Message templates</Typography>
      <Button variant="contained" href="/templates/add">Add template</Button>
    </Stack>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      A message uses the template of its type that best matches the member&apos;s membership and member type; deprecated templates are skipped.
    </Typography>
    <DataList
      rowHref={(template) => `/template/${template._id}`}
      rows={templates}
      columns={columns}
      loading={loading}
      empty="No templates yet."
      defaultSort={{ field: 'name', sort: 'asc' }}
    />
  </Box>
);

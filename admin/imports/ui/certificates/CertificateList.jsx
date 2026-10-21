import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { linkColumn } from '../components/columns';

/**
 * The certificates members can hold.
 *
 * @param {{ loading: boolean, certificates: object[], workshopName: (id) => string }} props
 */
export const CertificateList = ({ loading, certificates, workshopName }) => {
  const columns = [
    linkColumn('name', 'Name', (c) => `/certificate/${c._id}`, { valueGetter: (value) => value?.sv || '' }),
    { field: 'nameEn', headerName: 'Name (English)', flex: 1, minWidth: 160, valueGetter: (v, row) => row.name?.en || '' },
    { field: 'workshopId', headerName: 'Workshop', width: 200, valueGetter: (value) => (value ? workshopName(value) || '' : '') },
    { field: 'defaultValidityDays', headerName: 'Validity (days)', type: 'number', width: 130 },
    { field: 'certifierRole', headerName: 'Certifier role', width: 130 },
    { field: 'test', headerName: 'Test', width: 130, valueGetter: (value) => value?.testId || '' },
    { field: 'mandatory', headerName: 'Mandatory', type: 'boolean', width: 110, valueGetter: (value) => !!value },
  ];
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">Certificates</Typography>
        <Button variant="contained" href="/certificates/add">Add certificate</Button>
      </Stack>
      <DataList
        rowHref={(c) => `/certificate/${c._id}`}
        rows={certificates}
        columns={columns}
        loading={loading}
        empty="No certificates yet."
        defaultSort={{ field: 'name', sort: 'asc' }}
      />
    </Box>
  );
};

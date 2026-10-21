import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DataList } from '../components/DataList';
import { linkColumn } from '../components/columns';

/**
 * The expense accounts members spend on.
 *
 * @param {{ loading: boolean, accounts: object[], groupName: (id) => string, canAdd?: boolean }} props
 */
export const ExpenseAccountList = ({ loading, accounts, groupName, canAdd = true }) => {
  const columns = [
    linkColumn('name', 'Name', (a) => `/expenseaccount/${a._id}`),
    { field: 'explanation', headerName: 'Explanation', flex: 2, minWidth: 220 },
    { field: 'groupIds', headerName: 'Groups', flex: 1, minWidth: 180, valueGetter: (v) => (v || []).map(groupName).filter(Boolean).join(', ') },
    { field: 'approvers', headerName: 'Approvers', type: 'number', width: 110, valueGetter: (v, row) => (row.approverMemberIds || []).length },
    { field: 'approverGroups', headerName: 'Approver groups', type: 'number', width: 140, valueGetter: (v, row) => (row.approverGroupIds || []).length },
  ];
  return (
    <Box>
      <Link href="/expenses" underline="hover" variant="body2">← Expenses</Link>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 0.5, mb: 2 }}>
        <Typography variant="h4" component="h1">Expense accounts</Typography>
        {canAdd && <Button variant="contained" href="/expenses/accounts/add">Add expense account</Button>}
      </Stack>
      <DataList rows={accounts} columns={columns} loading={loading} empty="No expense accounts yet." defaultSort={{ field: 'name', sort: 'asc' }} rowHref={(a) => `/expenseaccount/${a._id}`} />
    </Box>
  );
};

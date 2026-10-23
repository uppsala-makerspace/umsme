import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { ExpenseTable } from './ExpenseList';
import { kr, isoDay } from './labels';
import { DateField } from '../components/DateField';

/**
 * What the treasurer pays: invoices to the supplier, soonest due first, and
 * receipts to reimburse the member; or what has been paid in a range of
 * payment dates, with the sum.
 *
 * @param {{ view: 'queue'|'reimbursed', onViewChange: (view) => void, invoices: object, receipts: object,
 *           range: { from, to }, onRangeChange: (field, value) => void,
 *           reimbursed?: { rows: object[], total: number }, onOpen: (expenseId) => void }} props
 *   `invoices` and `receipts` as useServerList gives them.
 */
export const ReimburseQueue = ({ view, onViewChange, invoices, receipts, range, onRangeChange, reimbursed, onOpen }) => (
  <Box>
    <Typography variant="h4" component="h1" sx={{ mb: 2 }}>Expenses to reimburse or pay</Typography>
    <ToggleButtonGroup exclusive size="small" value={view} onChange={(e, next) => next && onViewChange(next)} sx={{ mb: 2 }}>
      <ToggleButton value="queue">To reimburse or pay</ToggleButton>
      <ToggleButton value="reimbursed">Reimbursed</ToggleButton>
    </ToggleButtonGroup>
    {view === 'queue' ? (
      <>
        <Typography variant="h5" component="h2">Invoices to pay</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Pay the supplier using the details on the invoice. Soonest due date first.</Typography>
        <ExpenseTable list={invoices} empty="No invoices to pay." />
        <Typography variant="h5" component="h2" sx={{ mt: 3, mb: 1 }}>Receipts to reimburse</Typography>
        <ExpenseTable list={receipts} empty="No receipts to reimburse." />
      </>
    ) : (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Expenses reimbursed or set up for payment, by payment date. Leave To empty to include everything ahead.</Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <DateField label="From" value={range.from} onChange={(v) => onRangeChange('from', v)} />
          <DateField label="To" value={range.to} onChange={(v) => onRangeChange('to', v)} />
        </Stack>
        {!reimbursed ? <Typography color="text.secondary">Looking…</Typography> : reimbursed.rows.length === 0
          ? <Typography>No reimbursed expenses in this period.</Typography>
          : (
            <Table size="small">
              <TableHead><TableRow><TableCell>Payment date</TableCell><TableCell>Type</TableCell><TableCell>Member</TableCell><TableCell>Supplier / place</TableCell><TableCell>Account</TableCell><TableCell align="right">Amount</TableCell></TableRow></TableHead>
              <TableBody>
                {reimbursed.rows.map((e) => (
                  <TableRow key={e._id} hover sx={{ cursor: 'pointer' }} onClick={() => onOpen(e._id)}>
                    <TableCell>{isoDay(e.reimbursedDate)}</TableCell>
                    <TableCell>{e.type === 'invoice' ? <Chip size="small" color="warning" label="invoice" /> : 'receipt'}</TableCell>
                    <TableCell>{e.memberName}</TableCell>
                    <TableCell>{e.place || ''}</TableCell>
                    <TableCell>{e.accountName}</TableCell>
                    <TableCell align="right">{typeof e.amount === 'number' ? kr(e.amount) : ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow><TableCell colSpan={5}>Total, {reimbursed.rows.length} expenses</TableCell><TableCell align="right">{kr(reimbursed.total)}</TableCell></TableRow>
              </TableFooter>
            </Table>
          )}
      </>
    )}
  </Box>
);

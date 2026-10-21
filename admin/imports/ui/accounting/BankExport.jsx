import React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

const R = (props) => <TableCell align="right" {...props} />;

/**
 * Turn a bank report into a SIE file for the bookkeeping and a smaller CSV
 * of what was not recognized. Nothing is stored.
 *
 * @param {{ onFile: (file) => void, busy?: boolean, error?: string, result?: object,
 *           onDownloadSie?: () => void, onDownloadRemaining?: () => void }} props
 *   `result` as accounting.processBankFile returns it.
 */
export const BankExport = ({ onFile, busy = false, error, result, onDownloadSie, onDownloadRemaining }) => {
  const s = result?.summary;
  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>Bank export</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 800 }}>
        Upload a bank transaction report (CSV from Swedbank). Recognized transactions (expense reimbursements, member
        payments, standard income) are turned into a SIE file for import into the bookkeeping system; everything else is
        returned as a smaller CSV in the same format for manual entry. Nothing is stored: running the same file twice gives
        the same result twice.
      </Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
        <Button component="label" variant="contained" disabled={busy}>
          Choose bank file
          {/* style, not hidden: Bootstrap 3 gives file inputs display: block. */}
          <input type="file" aria-label="Bank file (CSV)" accept=".csv,text/csv" style={{ display: 'none' }}
            onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ''; }} />
        </Button>
        {busy && <Typography color="text.secondary">Processing…</Typography>}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {s && (
        <>
          <Typography variant="h5" component="h2" sx={{ mt: 3, mb: 1 }}>Summary</Typography>
          <Table size="small" sx={{ maxWidth: 640, mb: 2 }}>
            <TableHead><TableRow><TableCell>Category</TableCell><R>Rows</R><R>Sum (kr)</R></TableRow></TableHead>
            <TableBody>
              {[
                ['Expense reimbursements (U)', s.expenses],
                ['Member payments (M)', s.memberPayments],
                ['Standard income (S)', s.standardIncome],
                ['Not recognized (remaining CSV)', s.remaining],
              ].map(([label, part]) => <TableRow key={label}><TableCell>{label}</TableCell><R>{part.count}</R><R>{part.sum}</R></TableRow>)}
              <TableRow sx={{ '& td': { fontWeight: 700 } }}><TableCell>Total in file</TableCell><R>{s.totalRows}</R><R>{s.totalSum}</R></TableRow>
            </TableBody>
          </Table>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Control: SIE bank legs {s.control.bankLegs} + remaining {s.control.remainingSum} = file total {s.totalSum}{' '}
            {s.control.holds
              ? <Chip size="small" color="success" label="OK" />
              : <Chip size="small" color="error" label="MISMATCH — do not import" />}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Candidates considered: {s.pools.reimbursedExpenses} reimbursed expenses ({s.pools.expensesMissingReimbursedDate} without
            reimbursement date, {s.pools.expensesMissingAccount} without bookkeeping account), {s.pools.callbackPayments} Swish-callback
            payments, {s.pools.bankImportPayments} bank-synced payments.
          </Typography>

          {result.flags.length > 0 && (
            <>
              <Typography variant="h6" component="h3">Needs attention</Typography>
              <Box component="ul" sx={{ mt: 0.5 }}>
                {result.flags.map((f) => <li key={`${f.rowNr}-${f.reason}`}><strong>Row {f.rowNr}</strong> — {f.reason}: {f.detail}</li>)}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Flagged rows are left in the remaining CSV for manual handling.</Typography>
            </>
          )}
          {result.diagnostics.length > 0 && (
            <>
              <Typography variant="h6" component="h3">Why rows didn&apos;t match</Typography>
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead><TableRow><TableCell>Row</TableCell><TableCell>Transaction</TableCell><R>Amount</R><TableCell>Reason</TableCell></TableRow></TableHead>
                <TableBody>
                  {result.diagnostics.map((d) => (
                    <TableRow key={d.rowNr}><TableCell>{d.rowNr}</TableCell><TableCell>{d.text}</TableCell><R>{d.belopp}</R><TableCell>{d.why}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={onDownloadSie}>Download SIE file</Button>
            <Button variant="outlined" onClick={onDownloadRemaining}>Download remaining CSV</Button>
          </Stack>
        </>
      )}
    </Box>
  );
};

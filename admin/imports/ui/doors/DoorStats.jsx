import React, { useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ChartCanvas } from '../components/ChartCanvas';

const SOURCES = { lock: 'from the lock\'s own log', recorded: 'from the openings recorded here (app and lock)' };

/**
 * How often people open the door: how many visited 1-5 times in six months,
 * 6-10 times, and so on, counted from the lock's log or from what is
 * recorded here.
 *
 * @param {{ visits?: { labels: string[], counts: number[] }, source?: 'lock'|'recorded',
 *           onCheck: (source) => void, busy?: boolean, error?: string }} props
 */
export const DoorStats = ({ visits, source, onCheck, busy = false, error }) => {
  const config = useMemo(() => visits && ({
    type: 'bar',
    data: {
      labels: visits.labels,
      datasets: [{ label: 'Dörröppningar', data: visits.counts, borderWidth: 2, borderColor: 'rgba(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.2)' }],
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } },
  }), [visits]);
  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>Door statistics</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>How many people opened the outer door how often in the last six months.</Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Button variant="contained" disabled={busy} onClick={() => onCheck('lock')}>Check door visits</Button>
        <Button variant="outlined" disabled={busy} onClick={() => onCheck('recorded')}>Count recorded visits</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {busy && <Typography color="text.secondary">Counting…</Typography>}
      {config && (
        <>
          <Typography variant="body2" sx={{ mb: 1 }}>Visits {SOURCES[source]}.</Typography>
          <ChartCanvas config={config} label="Visits per person" />
        </>
      )}
    </Box>
  );
};

import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ChartCanvas } from '../components/ChartCanvas';
import { membershipCharts } from './membershipCharts';
import { FORM_WIDTH } from '../components/PageTabs';

const INTERVALS = [
  { value: 'all', label: 'All time' },
  { value: 'year', label: 'Last year' },
  { value: 'quarter', label: 'Last quarter' },
  { value: 'month', label: 'Last month' },
];
const COUNTS = [['members', 'All members'], ['individual', 'No lab'], ['individualLab', 'Lab'], ['family', 'No lab - family'], ['familyLab', 'Lab - family']];

/**
 * Membership statistics for a period: the member count now, and charts of
 * members over time, joining and leaving, churn, time to renew and years
 * as a member.
 *
 * @param {{ statistics?: { counts, series, monthly }, interval: string, onIntervalChange: (interval) => void }} props
 */
export const Statistics = ({ statistics, interval, onIntervalChange }) => {
  const charts = useMemo(() => (statistics ? membershipCharts(statistics) : []), [statistics]);
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>Memberships</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={6} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h6" component="h2">Time period</Typography>
          <RadioGroup value={interval} onChange={(e) => onIntervalChange(e.target.value)}>
            {INTERVALS.map((i) => <FormControlLabel key={i.value} value={i.value} control={<Radio size="small" />} label={i.label} />)}
          </RadioGroup>
        </Box>
        <Box>
          <Typography variant="h6" component="h2">Current member count</Typography>
          {COUNTS.map(([key, label]) => (
            <Typography key={key} variant="body2">{label}: <strong>{statistics?.counts[key] ?? '–'}</strong></Typography>
          ))}
        </Box>
      </Stack>
      {!statistics && <Typography color="text.secondary">Counting…</Typography>}
      {charts.map((c) => (
        <Box key={c.label} sx={{ mb: 4 }}>
          {c.note && <Typography variant="body2" color="text.secondary" sx={{ mb: 1, maxWidth: FORM_WIDTH }}>{c.note}</Typography>}
          <ChartCanvas config={c.config} label={c.label} />
        </Box>
      ))}
    </Box>
  );
};

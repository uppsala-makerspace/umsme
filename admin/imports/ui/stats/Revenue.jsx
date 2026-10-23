import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { ChartCanvas } from '../components/ChartCanvas';
import {
  kr, signedKr, percentText, direction, categories, summary, yearlyRows, yearOverYearRows,
  forecastRows, excludedItems, revenueCharts,
} from './revenuePresentation';
import { FORM_WIDTH } from '../components/PageTabs';

const CHANGE = { up: 'success.dark', down: 'error.main', '': 'inherit' };
const Num = ({ children, change, bold, title }) => (
  <TableCell align="right" title={title || undefined}
    sx={{ whiteSpace: 'nowrap', color: CHANGE[direction(change)] || 'inherit', fontWeight: bold ? 700 : undefined }}>
    {children}
  </TableCell>
);
const Small = ({ children }) => <Typography component="span" variant="caption" color="text.secondary" sx={{ fontStyle: 'normal' }}> {children}</Typography>;
const Caption = ({ children }) => <Typography variant="body2" color="text.secondary" sx={{ maxWidth: FORM_WIDTH, mb: 1.5 }}>{children}</Typography>;
const Heading = ({ children }) => <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 1 }}>{children}</Typography>;

const Figure = ({ label, value, note }) => (
  <Box sx={{ minWidth: 220 }}>
    <Typography variant="overline" color="text.secondary">{label}</Typography>
    <Typography variant="h5" component="p" sx={{ fontWeight: 700 }}>{value}</Typography>
    <Typography variant="body2" color="text.secondary">{note}</Typography>
  </Box>
);

/**
 * Membership revenue: where it has been, and where the trend points. The
 * figures come worked out from the server; this only lays them out.
 *
 * @param {{ model?: object }} props  As stats.revenue returns it.
 */
export const Revenue = ({ model }) => {
  const charts = useMemo(() => (model ? revenueCharts(model) : []), [model]);
  if (!model) {
    return (
      <Box>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>Revenue</Typography>
        <Typography color="text.secondary">Counting…</Typography>
      </Box>
    );
  }
  const s = summary(model);
  const currentYear = new Date(model.today).getFullYear();
  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>Revenue</Typography>
      <Caption>
        Membership payments only: every payment linked to a membership, counted in the month the money arrived and at
        the amount actually paid.
      </Caption>

      <Stack direction="row" spacing={4} useFlexGap sx={{ flexWrap: 'wrap', my: 3 }}>
        <Figure label="Last twelve months" value={kr(s.trailingYear)} note="exactly one year back from today" />
        <Figure label="Current annual rate" value={kr(s.level)} note={`trend line at ${s.lastCompleteMonth}`} />
        <Figure label="Growth" value={kr(s.slopePerYear)} note={`per year, ${kr(s.slope)} per month`} />
      </Stack>

      <Heading>All history</Heading>
      <Caption>
        Revenue per month since {s.firstMonth}, split by what was bought. The line is the trailing twelve-month sum on the
        right-hand axis, which is what the forecast below is fitted to.
      </Caption>
      {charts[0] && <ChartCanvas config={charts[0].config} label={charts[0].label} />}

      <Heading>Last twelve months, against the year before</Heading>
      <Caption>Each month next to the same month a year earlier, so growth is readable month by month rather than through the trend line.</Caption>
      {charts[1] && <ChartCanvas config={charts[1].config} label={charts[1].label} />}
      <Table size="small" sx={{ my: 2 }}>
        <caption>Month by month against the year before</caption>
        <TableHead>
          <TableRow><TableCell>Month</TableCell><Num>Revenue</Num><Num>Year before</Num><Num>Change</Num><Num>%</Num></TableRow>
        </TableHead>
        <TableBody>
          {yearOverYearRows(model).map((r) => (
            <TableRow key={r.month}>
              <TableCell>{r.month}</TableCell>
              <Num>{kr(r.total)}</Num>
              <Num>{r.previousYear !== null ? kr(r.previousYear) : '—'}</Num>
              <Num change={r.diff}>{r.previousYear !== null ? signedKr(r.diff) : '—'}</Num>
              <Num change={r.diff}>{r.percent !== null ? percentText(r.percent) : '—'}</Num>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Heading>Per year</Heading>
      <Table size="small" sx={{ mb: 1 }}>
        <TableHead>
          <TableRow>
            <TableCell>Year</TableCell>
            {categories.map((c) => <Num key={c.key}>{c.label}</Num>)}
            <Num>Total</Num><Num>Growth</Num>
          </TableRow>
        </TableHead>
        <TableBody>
          {yearlyRows(model).map((row) => (
            <TableRow key={row.year} sx={row.incomplete ? { '& td': { fontStyle: 'italic' } } : undefined}>
              <TableCell>{row.year}{row.incomplete && <Small>so far</Small>}{row.coversFrom && <Small>from {row.coversFrom}</Small>}</TableCell>
              {row.amounts.map((a, i) => <Num key={categories[i].key}>{kr(a)}</Num>)}
              <Num bold>{kr(row.total)}</Num>
              <Num change={row.growth} title={row.growthTitle}>{row.growth !== null ? percentText(row.growth) : '—'}</Num>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Caption>
        Growth compares each year with the one before. {currentYear} is still running, so its figure compares the months
        elapsed this year with the same months last year: a part year against a whole one would read as a fall in the
        middle of a rise.
      </Caption>

      <Heading>Forecast</Heading>
      <Caption>
        Every row fits a straight line to the trailing twelve-month sum over the twelve points before the year it
        forecasts, not to the individual months, since membership revenue is strongly seasonal and a fit to monthly values
        slopes whichever way the window happens to open. Where that line stands is the annual rate, and how steeply it
        rises is its trend. A year still in progress counts the revenue already received and only models the rest.
      </Caption>
      <Caption>
        The two rows ahead share the fit made today: {s.fitMonths} points ending {s.lastCompleteMonth}, an annual rate
        of {kr(s.level)} rising {kr(s.slope)} a month. Each earlier row has its own, made at the time.
      </Caption>
      <Table size="small" sx={{ mb: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>Year</TableCell><TableCell>From</TableCell>
            <Num>Actual</Num><Num>Actual/mo</Num><Num>Growth/mo</Num><Num>Trend/mo</Num><Num>Trend</Num><Num>Flat</Num>
          </TableRow>
        </TableHead>
        <TableBody>
          {forecastRows(model).map((r) => (
            <TableRow key={r.year} sx={r.partial ? { '& td': { fontStyle: 'italic' } } : undefined}>
              <TableCell>{r.year}</TableCell>
              <TableCell>{r.madeAt || '—'}</TableCell>
              <Num>{r.actual !== null ? <>{kr(r.actual)}{r.partial && <Small>so far</Small>}</> : '—'}</Num>
              <Num title={r.perMonthTitle}>{r.perMonth !== null ? kr(r.perMonth) : '—'}</Num>
              <Num change={r.actualGrowth} title={r.actualGrowthTitle}>{r.actualGrowth !== null ? signedKr(r.actualGrowth) : '—'}</Num>
              <Num>{r.slope !== null ? signedKr(r.slope) : '—'}</Num>
              <Num bold>{r.trend !== null ? <>{kr(r.trend)}{r.trendMiss && <Small>{r.trendMiss}</Small>}</> : '—'}</Num>
              <Num bold>{r.flat !== null ? <>{kr(r.flat)}{r.flatMiss && <Small>{r.flatMiss}</Small>}</> : '—'}</Num>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 2, rowGap: 0.5, typography: 'body2', color: 'text.secondary', '& dt': { fontWeight: 700 }, '& dd': { m: 0 } }}>
        <dt>From</dt><dd>where the forecast was made</dd>
        <dt>Actual</dt><dd>revenue actually received that year</dd>
        <dt>Actual/mo</dt><dd>that revenue averaged over the months on record</dd>
        <dt>Growth/mo</dt><dd>what that monthly average really gained on the year before</dd>
        <dt>Trend/mo</dt><dd>what the fitted line expected it to gain, at the time</dd>
        <dt>Trend</dt><dd>the year with that growth carried forward</dd>
        <dt>Flat</dt><dd>the year with the annual rate held still</dd>
      </Box>
      <Caption>
        <strong>Growth/mo</strong> and <strong>Trend/mo</strong> are the same quantity measured at different times, which
        is why they differ: the trend is fitted before the year begins, the growth is what the year went on to deliver. A
        finished year is forecast from the end of the year before, so the model never sees the year it is predicting. On
        this data both variants have come out consistently low: revenue has been compounding rather than climbing by a
        fixed amount, which a straight line cannot follow, and the trend per month has itself been climbing year on year.
        Read the two rows ahead as a floor rather than a best guess.
      </Caption>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4, maxWidth: FORM_WIDTH }}>
        Not in the figures above:{' '}
        {excludedItems(model).map((e) => <Box component="span" key={e.label} sx={{ mr: 1.5 }}>{e.label} {e.count} ({kr(e.sum)})</Box>)}
        Unclassified payments are the ones waiting for a treasurer to connect them to a membership under Payments → Manual.
      </Typography>
    </Box>
  );
};

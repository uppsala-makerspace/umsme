import React from 'react';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';

/**
 * How far a group mail under way has come: "200 of 800 done", or that it
 * has been through everyone and waits for a decision on those it failed for.
 *
 * @param {{ job: { _id, subject, status, total, sent, failed }, link?: boolean }} props
 *   With `link`, the subject links to the mail's page.
 */
export const Progress = ({ job, link = false }) => {
  const done = job.sent + job.failed;
  const subject = link ? <Link href={`/mail/${job._id}`}>{job.subject}</Link> : <strong>{job.subject}</strong>;
  if (job.status === 'review') {
    return (
      <Alert severity="warning" role="status" sx={{ mb: 2 }}>
        {subject} could not be sent to {job.failed} of {job.total}. It waits for a decision on its page, try again or OK; no other mail can be sent until then.
      </Alert>
    );
  }
  return (
    <Alert severity="info" role="status" sx={{ mb: 2, '& .MuiAlert-message': { flex: 1 } }}>
      {subject} is being sent: {done} of {job.total} done
      {job.failed > 0 ? ` (${job.failed} failed)` : ''}. No other mail can be sent until it is.
      <LinearProgress variant="determinate" value={job.total ? (100 * done) / job.total : 0} sx={{ mt: 1 }} />
    </Alert>
  );
};

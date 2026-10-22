import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from '../navigation';
import { CommentsFor } from '../comments/CommentsFor';
import { TemplateDocumentation } from '../messageTemplates/TemplateDocumentation';
import { useAnnouncement } from '../announcements/data';
import { MailList } from './MailList';
import { MailView } from './MailView';
import { SendMail, mailValues } from './SendMail';
import { mailList, mailDetail, removeMail, mailToAnnouncement, mailSenders, mailRecipients, sendMail, mailSending, retryMail, acceptMail } from './data';

const reason = (e) => e.reason || e.message;
const POLL = 2000;

/** Call `load` now and, while `again(result)` holds, every POLL ms. */
const usePolling = (load, again, deps) => {
  useEffect(() => {
    let timer;
    let live = true;
    const tick = () => load().then((result) => { if (live && again(result)) timer = setTimeout(tick, POLL); }, () => {});
    tick();
    return () => { live = false; clearTimeout(timer); };
  }, deps);
};

/** /mail */
export const MailsPage = () => {
  const [mails, setMails] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { mailList().then(setMails, (e) => setError(reason(e))); }, []);
  return <MailList mails={mails || []} loading={!mails && !error} error={error} />;
};

/** /mail/:_id */
export const MailViewPage = ({ _id }) => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [round, setRound] = useState(0);
  // Asked again while the mail is under way, also while it waits: someone else may decide.
  usePolling(() => mailDetail(_id).then((d) => { setDetail(d); return d; }, (e) => { setError(reason(e)); throw e; }),
    (d) => d.mail.status === 'sending' || d.mail.status === 'review', [_id, round]);
  if (!detail) return <Typography color={error ? 'error' : 'text.secondary'}>{error || 'Loading…'}</Typography>;
  const act = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(reason(e));
    }
    setBusy(false);
  };
  const decide = (action) => act(async () => { await action(_id); setRound((r) => r + 1); });
  return (
    <MailView
      detail={detail} busy={busy} error={error}
      on={{
        toAnnouncement: () => act(async () => navigate(`/announcement/${await mailToAnnouncement(_id)}`)),
        remove: () => act(async () => { await removeMail(_id); navigate('/mail'); }),
        retry: () => decide(retryMail),
        accept: () => decide(acceptMail),
      }}
      after={<CommentsFor about={_id} />}
    />
  );
};

/** /mail/send?announcement=… */
export const SendMailPage = () => {
  const navigate = useNavigate();
  const announcementId = new URLSearchParams(window.location.search).get('announcement');
  const { loading, announcement } = useAnnouncement(announcementId);
  const [values, setValues] = useState(null);
  const [senders, setSenders] = useState([]);
  const [recipients, setRecipients] = useState(null);
  const [starting, setStarting] = useState(false);
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { mailSenders().then(setSenders, (e) => setError(reason(e))); }, []);
  // Whether some mail goes out now, whoever sent it; asked again until it is done.
  usePolling(() => mailSending().then((j) => { setJob(j || null); return j; }), (j) => !!j, []);
  useEffect(() => { if (!loading && !values) setValues(mailValues(announcement)); }, [loading]);
  useEffect(() => {
    if (!values) return undefined;
    let current = true;
    setRecipients(null);
    mailRecipients(values.recipients, values.family, values.since).then((r) => current && setRecipients(r), (e) => current && setError(reason(e)));
    return () => { current = false; };
  }, [values?.recipients, values?.family, values?.since]);
  if (!values) return <Typography color="text.secondary">Loading…</Typography>;
  const send = async (to) => {
    setStarting(true);
    setError(null);
    try {
      const only = recipients.filter((r) => to.includes(r.to)).map((r) => r.email);
      const { from, recipients: group, family, since, subject, template, format } = values;
      const { mailId } = await sendMail({ from, recipients: group, family, since, subject, template, format, only, ...(announcement ? { announcementId: announcement._id } : {}) });
      navigate(`/mail/${mailId}`);
    } catch (e) {
      setError(reason(e));
      setStarting(false);
    }
  };
  return (
    <SendMail
      values={values} onChange={(f, v) => setValues((c) => ({ ...c, [f]: v }))} senders={senders} recipients={recipients}
      onSend={send} starting={starting} job={job} error={error} announcement={announcement} documentation={<TemplateDocumentation />}
    />
  );
};

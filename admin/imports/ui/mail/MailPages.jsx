import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from '../navigation';
import { CommentsFor } from '../comments/CommentsFor';
import { TemplateDocumentation } from '../messageTemplates/TemplateDocumentation';
import { useAnnouncement } from '../announcements/data';
import { MailList } from './MailList';
import { MailView } from './MailView';
import { SendMail, mailValues } from './SendMail';
import { mailList, mailDetail, removeMail, mailToAnnouncement, mailSenders, mailRecipients, sendMail } from './data';

const reason = (e) => e.reason || e.message;

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
  useEffect(() => { mailDetail(_id).then(setDetail, (e) => setError(reason(e))); }, [_id]);
  if (!detail) return <Typography color={error ? 'error' : 'text.secondary'}>{error || 'Loading…'}</Typography>;
  const act = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(reason(e));
      setBusy(false);
    }
  };
  return (
    <MailView
      detail={detail} busy={busy} error={error}
      on={{
        toAnnouncement: () => act(async () => navigate(`/announcement/${await mailToAnnouncement(_id)}`)),
        remove: () => act(async () => { await removeMail(_id); navigate('/mail'); }),
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
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { mailSenders().then(setSenders, (e) => setError(reason(e))); }, []);
  useEffect(() => { if (!loading && !values) setValues(mailValues(announcement)); }, [loading]);
  useEffect(() => {
    if (!values) return undefined;
    let current = true;
    setRecipients(null);
    mailRecipients(values.recipients, values.family).then((r) => current && setRecipients(r), (e) => current && setError(reason(e)));
    return () => { current = false; };
  }, [values?.recipients, values?.family]);
  if (!values) return <Typography color="text.secondary">Loading…</Typography>;
  const send = async (to) => {
    setSending(true);
    setError(null);
    try {
      const only = recipients.filter((r) => to.includes(r.to)).map((r) => r.email);
      const { from, recipients: group, family, subject, template, format } = values;
      const { mailId } = await sendMail({ from, recipients: group, family, subject, template, format, only, ...(announcement ? { announcementId: announcement._id } : {}) });
      navigate(announcement ? `/announcement/${announcement._id}` : '/mail');
    } catch (e) {
      setError(reason(e));
      setSending(false);
    }
  };
  return (
    <SendMail
      values={values} onChange={(f, v) => setValues((c) => ({ ...c, [f]: v }))} senders={senders} recipients={recipients}
      onSend={send} sending={sending} error={error} announcement={announcement} documentation={<TemplateDocumentation />}
    />
  );
};

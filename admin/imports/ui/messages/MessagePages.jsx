import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from '../navigation';
import { SendMessage } from './SendMessage';
import { MessageView } from './MessageView';
import { composeMessage, sendMessage, messageDetail, removeMessage } from './data';

/** /message/send?member=…&template=…&membership=… */
export const SendMessagePage = () => {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const memberId = params.get('member');
  const templateId = params.get('template');
  const membershipId = params.get('membership');
  const [draft, setDraft] = useState(null);
  const [values, setValues] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    composeMessage(memberId, templateId, membershipId).then((d) => {
      setDraft(d);
      setValues({ to: d.to, subject: d.subject, messagetext: d.messagetext });
    }, (e) => setError(e.reason || e.message));
  }, [memberId, templateId, membershipId]);
  if (!draft) return <Typography color={error ? 'error' : 'text.secondary'}>{error || 'Writing the message…'}</Typography>;
  return (
    <SendMessage
      memberId={memberId} draft={draft} values={values} busy={busy} error={error}
      onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
      onSend={async () => {
        setBusy(true);
        setError(null);
        try {
          await sendMessage({ memberId, templateId, membershipId: membershipId || null, ...values });
          navigate(`/member/${memberId}`);
        } catch (e) {
          setError(e.reason || e.message);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
};

/** /message/:_id */
export const MessageViewPage = ({ _id }) => {
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { messageDetail(_id).then(setDetail, (e) => setError(e.reason || e.message)); }, [_id]);
  if (!detail) return <Typography color={error ? 'error' : 'text.secondary'}>{error || 'Loading…'}</Typography>;
  return (
    <MessageView
      message={detail.message} memberName={detail.memberName} error={error}
      onDelete={async () => {
        try {
          await removeMessage(_id);
          navigate(`/member/${detail.message.member}`);
        } catch (e) {
          setError(e.reason || e.message);
        }
      }}
    />
  );
};

import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { useNavigate } from '../navigation';
import { MessageActions } from './MessageActions';
import { MessageList } from './MessageList';
import { useMessages, membershipTemplate, reminderTemplate, setReminded, sendPath } from './data';

/**
 * The Messages tab of a member's or a membership's page: what can be sent
 * (its toolbar) and what has been. `onCount` hears how many have been sent.
 */
export const MessagesFor = ({ memberId, membershipId, onCount }) => {
  const navigate = useNavigate();
  const list = useMessages(membershipId ? { membership: membershipId } : { member: memberId });
  useEffect(() => { if (onCount && !list.loading) onCount(list.messages.length); }, [list.loading, list.messages.length]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const act = async (action) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try { await action(); } catch (e) { setError(e.reason || e.message); } finally { setBusy(false); }
  };
  return (
    <Box component="section" aria-label="Messages">
      <MessageActions
        kind={membershipId ? 'membership' : 'member'} busy={busy} error={error} notice={notice}
        onSend={(type) => act(async () => {
          const templateId = type === 'reminder' ? await reminderTemplate(memberId) : await membershipTemplate(memberId, membershipId, type);
          navigate(sendPath({ memberId, templateId, membershipId }));
        })}
        onMarkReminded={(reminded) => act(async () => {
          await setReminded(memberId, reminded);
          setNotice(reminded ? 'Marked as reminded.' : 'Marked as needing a reminder.');
        })}
      />
      <MessageList {...list} />
    </Box>
  );
};

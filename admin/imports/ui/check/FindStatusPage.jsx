import React, { useEffect, useRef, useState } from 'react';
import { FindStatus } from './FindStatus';
import { findMemberId, mailMembershipStatus, checkPath } from './data';

/**
 * Finds the status page and goes there in the top window: the website shows
 * this page in a frame, and the status page where checkPath says.
 */
export const FindStatusPage = () => {
  const [wrong, setWrong] = useState(false);
  const [mailedTo, setMailedTo] = useState(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const onFind = async (email, mid) => {
    setBusy(true);
    setWrong(false);
    try {
      const id = await findMemberId(email, mid);
      if (id) window.top.location.href = `${checkPath()}${id}`;
      else setWrong(true);
    } catch (e) {
      setWrong(true);
    } finally {
      setBusy(false);
    }
  };
  // Says the same whether or not anyone has the email, so the page does not tell who is a member.
  const onMail = async (email) => {
    await mailMembershipStatus(email).catch(() => {});
    setMailedTo(email);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMailedTo(null), 10000);
  };
  return <FindStatus onFind={onFind} onMail={onMail} wrong={wrong} mailedTo={mailedTo} busy={busy} />;
};

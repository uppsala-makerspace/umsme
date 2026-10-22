import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { SendMail, mailValues } from './SendMail';

const recipients = [
  { to: 'Maja Medlem <member@example.org>', email: 'member@example.org', name: 'Maja Medlem' },
  { to: 'Bertil Styrelse <board@example.org>', email: 'board@example.org', name: 'Bertil Styrelse' },
];
const announcement = { _id: 'a1', subjectSv: 'Stängt under jul', subjectEn: 'Closed over Christmas', bodySv: 'Lokalen är **stängd**.', bodyEn: 'The space is **closed**.' };

const Editable = ({ initial, ...props }) => {
  const [values, setValues] = useState(initial);
  return <SendMail {...props} values={values} onChange={(f, v) => setValues((c) => ({ ...c, [f]: v }))} />;
};

export default {
  title: 'Mail/SendMail',
  component: SendMail,
  render: (args) => <Editable {...args} />,
  args: { initial: mailValues(null), senders: ['kansliet@example.org', 'no-reply@example.org'], recipients, onSend: fn() },
};

export const New = {};
export const FromAnnouncement = { args: { announcement, initial: { ...mailValues(announcement), from: 'kansliet@example.org', format: 'markdown' } } };
export const AnotherGoingOut = { args: { initial: { ...mailValues(announcement), from: 'kansliet@example.org' }, job: { _id: 'm9', subject: 'Nyhetsbrev oktober', total: 800, sent: 196, failed: 4 } } };
export const LoadingRecipients = { args: { recipients: null } };

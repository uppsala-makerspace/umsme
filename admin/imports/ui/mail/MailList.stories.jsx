import { MailList } from './MailList';

const mails = [
  { _id: 'm1', subject: 'Nyhetsbrev oktober', from: 'kansliet@example.org', recipients: 'members', family: true, sent: 212, failed: 2, senddate: new Date(2026, 9, 1, 9, 30) },
  { _id: 'm2', subject: 'Städdag', from: 'no-reply@example.org', recipients: 'labmembers', family: false, sent: 98, failed: 0, senddate: new Date(2026, 8, 12, 18, 0) },
];

export default { title: 'Mail/MailList', component: MailList, args: { mails } };

export const Mails = {};
export const Empty = { args: { mails: [] } };

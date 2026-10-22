import { fn } from 'storybook/test';
import { MailView } from './MailView';

const mail = {
  _id: 'm1', subject: 'Nyhetsbrev oktober', from: 'kansliet@example.org', recipients: 'members', family: true, senddate: new Date(2026, 9, 1, 9, 30),
  to: ['Maja Medlem <member@example.org>', 'Bertil Styrelse <board@example.org>'], failed: ['Olle Fel <wrong@example.org>'],
  template: '# Nyheter\n\nVälkommen på **städdag** lördag!', formatted: true,
};

export default {
  title: 'Mail/MailView',
  component: MailView,
  args: { detail: { mail, announcement: { _id: 'a1', subjectSv: 'Nyhetsbrev oktober' } }, on: { toAnnouncement: fn(), remove: fn(), retry: fn(), accept: fn() } },
};

export const FromAnnouncement = {};
export const Raw = { args: { detail: { mail: { ...mail, formatted: false, failed: [], template: 'Hej Maja!\n\nVälkommen på städdag.' }, announcement: null } } };
export const GoingOut = { args: { detail: { mail: { ...mail, status: 'sending', total: 800, failed: [] }, announcement: null } } };
export const SomeFailed = { args: { detail: { mail: { ...mail, status: 'review', total: 3 }, announcement: null } } };

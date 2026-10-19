import { fn } from 'storybook/test';
import { PaymentView } from './PaymentView';

const payment = { _id: 'p1', type: 'swish', amount: 200, date: new Date(2026, 9, 16), message: 'Medlemskap Nora', name: 'Nora Ny', mobile: '46700000123', kind: 'untreated' };
const member = { _id: 'm1', name: 'Nora Ny', mid: '125' };
const membership = { _id: 'ms1', amount: 200, start: new Date(2026, 9, 16), type: 'member', discount: false, family: false, memberend: new Date(2027, 9, 23) };
const on = Object.fromEntries(['assign', 'unassign', 'setOther', 'link', 'unlink', 'newMembership', 'remove'].map((k) => [k, fn()]));

export default {
  title: 'Payments/PaymentView',
  component: PaymentView,
  args: { search: async () => [member], on, detail: { payment, member: null, membership: null, linkable: [] } },
};

export const Untreated = {};
export const WaitingForAMembership = { args: { detail: { payment: { ...payment, member: 'm1' }, member, membership: null, linkable: [{ ...membership, _id: 'ms0', start: new Date(2025, 9, 1) }] } } };
export const Treated = { args: { detail: { payment: { ...payment, member: 'm1', membership: 'ms1', kind: 'membership' }, member, membership, linkable: [] } } };
export const Other = { args: { detail: { payment: { ...payment, other: true, kind: 'other' }, member: null, membership: null, linkable: [] } } };
export const Purchase = { args: { detail: { payment: { ...payment, storeItem: 's1', itemCode: 'lera', kind: 'purchase', member: 'm1' }, member, membership: null, storeItem: { _id: 's1', code: 'lera', name: { sv: 'Lera, 10 kg' } }, linkable: [] } } };

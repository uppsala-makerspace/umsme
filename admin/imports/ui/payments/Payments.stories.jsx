import React from 'react';
import { fn } from 'storybook/test';
import { Payments } from './Payments';
import { PaymentList } from './PaymentList';

const rows = [
  { _id: 'p1', type: 'swish', amount: 200, date: new Date(2026, 9, 16), message: 'Medlemskap', kind: 'untreated' },
  { _id: 'p2', type: 'bankgiro', amount: 1600, date: new Date(2026, 9, 12), message: '105', member: 'm1', memberName: 'Maja Medlem', kind: 'membership' },
  { _id: 'p3', type: 'swish', amount: 150, date: new Date(2026, 9, 10), message: 'ws:lera', storeItem: 's1', itemCode: 'lera', member: 'm2', memberName: 'Bo Basmedlem', kind: 'purchase' },
];
const list = { rows, total: rows.length, loading: false, query: { page: 0, pageSize: 25, sort: null, search: '' }, onQueryChange: () => {} };

export default {
  title: 'Payments/Payments',
  component: Payments,
  args: { tab: 'manual', onTab: fn(), list: <PaymentList tab="manual" list={list} />, storeItems: [{ value: 's1', label: 'Lera, 10 kg (lera)' }], onStoreItem: fn() },
};

export const Manual = {};
export const Purchases = { args: { tab: 'store', list: <PaymentList tab="store" list={{ ...list, rows: [rows[2]] }} /> } };

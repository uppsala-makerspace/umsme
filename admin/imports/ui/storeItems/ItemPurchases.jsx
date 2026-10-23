import React from 'react';
import { useServerList } from '../components/useServerList';
import { PaymentList } from '../payments/PaymentList';
import { paymentPage } from '../payments/data';

/** The purchases of one store item, newest first: Payments ▸ Purchases for the item. Containers only. */
export const ItemPurchases = ({ itemId }) => (
  <PaymentList tab="store" list={useServerList(paymentPage('store', itemId), { sort: { field: 'date', direction: 'desc' }, deps: [itemId] })} />
);

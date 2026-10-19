import { StoreItemList } from './StoreItemList';

const items = [
  { _id: 'i1', code: 'lera', name: { sv: 'Lera, 10 kg', en: 'Clay, 10 kg' }, price: 150, requiresMembership: true, bookkeepingAccount: '3010', status: 'available' },
  { _id: 'i2', code: 'laser', name: { sv: 'Lasertid, 1 timme' }, price: 50, requiresMembership: true, bookkeepingAccount: '3011', status: 'available' },
  { _id: 'i3', code: 'gava', name: { sv: 'Gåva', en: 'Donation' }, minPrice: 20, maxPrice: 5000, requiresMembership: false, bookkeepingAccount: '3990', status: 'available' },
  { _id: 'i4', code: 'tshirt', name: { sv: 'T-shirt' }, price: 200, requiresMembership: false, bookkeepingAccount: '3012', status: 'hidden' },
];

export default {
  title: 'Store items/StoreItemList',
  component: StoreItemList,
  args: { loading: false, items },
};

export const Items = {};
export const Loading = { args: { loading: true, items: [] } };
export const NoItems = { args: { items: [] } };

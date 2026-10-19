import React, { useState } from 'react';
import { fn } from 'storybook/test';
import { StoreItemForm } from './StoreItemForm';

const clay = {
  _id: 'i1', code: 'lera', name: { sv: 'Lera, 10 kg', en: 'Clay, 10 kg' }, price: 150, workshopIds: ['w1'],
  requiresMembership: true, commentRequired: false, bookkeepingAccount: '3010', status: 'available',
};
const values = (item) => ({
  code: item.code || '', nameSv: item.name?.sv || '', nameEn: item.name?.en || '', descriptionSv: '', descriptionEn: '',
  price: item.price ?? '', minPrice: item.minPrice ?? '', maxPrice: item.maxPrice ?? '',
  requiresMembership: !!item.requiresMembership, commentRequired: !!item.commentRequired,
  placeholderSv: '', placeholderEn: '', bookkeepingAccount: item.bookkeepingAccount || '', status: item.status || 'available', sortOrder: '',
  workshopIds: item.workshopIds || [],
});
const workshops = [
  { _id: 'w1', name: 'Keramikverkstaden', isArea: false },
  { _id: 'w2', name: 'Träverkstaden', isArea: false },
  { _id: 'w3', name: 'Retrodatorer', isArea: true },
];

/** Keeps the values, as the page does. */
const Editable = ({ values: initial, ...props }) => {
  const [current, setCurrent] = useState(initial);
  return <StoreItemForm {...props} values={current} onChange={(field, value) => setCurrent((v) => ({ ...v, [field]: value }))} />;
};

export default {
  title: 'Store items/StoreItemForm',
  component: StoreItemForm,
  render: (args) => <Editable {...args} />,
  args: {
    isNew: false, item: clay, values: values(clay), workshops, sales: { count: 0, total: 0 },
    onSave: fn(), onDelete: fn(), onUploadImage: fn(), onRemoveImage: fn(),
  },
};

export const NewItem = { args: { isNew: true, item: null, values: values({}), sales: null } };

/** Never bought: it can be deleted. */
export const NotBought = {};

/** Bought: hide it instead; the sales are shown. */
export const Bought = { args: { sales: { count: 12, total: 1800 } } };

export const BuyerSetsPrice = {
  args: {
    item: { ...clay, code: 'gava', name: { sv: 'Gåva' }, price: undefined, minPrice: 20, maxPrice: 5000 },
    values: values({ ...clay, code: 'gava', name: { sv: 'Gåva' }, price: undefined, minPrice: 20, maxPrice: 5000 }),
  },
};

export const Hidden = { args: { item: { ...clay, status: 'hidden' }, values: values({ ...clay, status: 'hidden' }) } };

export const SaveRefused = { args: { error: 'Someone else changed this item; reload it and try again' } };

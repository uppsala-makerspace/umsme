import React, { useEffect, useState } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate, useQueryParam } from '../navigation';
import { ItemPurchases } from './ItemPurchases';
import { useEditor } from '../components/useEditor';
import { StoreItemForm } from './StoreItemForm';
import {
  useStoreItem, formValues, saveStoreItem, storeItemSales, removeStoreItem,
  uploadStoreItemImage, removeStoreItemImage, imageUrl,
} from './data';

/** /storeitems/add without an id, /storeitem/:_id with one. */
export const StoreItemEditPage = ({ _id }) => {
  const [tab, setTab] = useQueryParam('tab');
  const navigate = useNavigate();
  const { loading, item, workshops } = useStoreItem(_id);
  const { values, setField, loaded, run, busy, error, setError, notice, setNotice } = useEditor({ doc: item, loading, toValues: formValues });
  const [sales, setSales] = useState(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (_id) storeItemSales(_id).then(setSales, (e) => setError(e.reason || e.message));
  }, [_id]);

  if (loading) return <Typography color="text.secondary">Loading…</Typography>;
  if (_id && !item) return <Typography color="text.secondary">There is no such store item.</Typography>;

  const choices = workshops.map((w) => ({ _id: w._id, name: w.name?.sv || w._id, isArea: w.kind === 'areaOfInterest' }));

  if (!_id) {
    return (
      <StoreItemForm
        isNew values={values} workshops={choices} busy={busy} error={error}
        onChange={setField}
        onSave={() => run(() => saveStoreItem(values, null), { then: (id) => navigate(`/storeitem/${id}`) })}
      />
    );
  }

  return (
    <StoreItemForm
      isNew={false}
      item={item}
      values={values}
      onChange={setField}
      onSave={() => run(() => saveStoreItem(values, loaded), { keep: 'all', then: () => setNotice('Saved.') })}
      busy={busy}
      error={error}
      notice={notice}
      workshops={choices}
      imageUrl={imageUrl(item)}
      uploading={uploading}
      onUploadImage={(file) => { setUploading(true); run(() => uploadStoreItemImage(_id, file)).finally(() => setUploading(false)); }}
      onRemoveImage={() => run(() => removeStoreItemImage(_id))}
      sales={sales}
      onDelete={() => run(() => removeStoreItem(_id), { then: () => navigate('/storeitems') })}
      purchases={<ItemPurchases itemId={_id} />}
      tab={tab || 'details'} onTab={(next) => setTab(next === 'details' ? '' : next)}
    />
  );
};

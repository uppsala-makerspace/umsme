import React, { useState } from 'react';
import { CategoryList } from './CategoryList';
import { useCategories, saveCategory, removeCategory } from './data';
import { useActivityList, useEventList } from '../activities/data';
import { useGroupList } from '../groups/data';
import { useWorkshopList } from '../workshops/data';

/** /categories */
export const CategoryListPage = () => {
  const { loading, categories } = useCategories();
  const { activities } = useActivityList();
  const { events } = useEventList();
  const { groups } = useGroupList();
  const { workshops } = useWorkshopList();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const attempt = async (action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(e.reason || e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const has = (id) => (doc) => doc.categoryId === id || (doc.categoryIds || []).includes(id);
  return (
    <CategoryList
      loading={loading} categories={categories} busy={busy} error={error}
      usage={(id) => [activities, events, groups, workshops].reduce((sum, docs) => sum + docs.filter(has(id)).length, 0)}
      onSave={(values, category) => attempt(() => saveCategory(values, category))}
      onDelete={(category) => attempt(() => removeCategory(category._id))}
    />
  );
};

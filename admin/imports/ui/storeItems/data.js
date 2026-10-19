import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { StoreItems } from '/imports/common/collections/storeItems';
import { Workshops } from '/imports/common/collections/workshops';

/**
 * Data for the store item pages: the narrow publications and the methods.
 * The pages' containers use this; the pure components never do.
 */

export const useStoreItemList = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.storeItems.list');
  return { loading: !handle.ready(), items: StoreItems.find({}, { sort: { code: 1 } }).fetch() };
}, []);

/** One whole item and the workshops it can be linked to; no item without an id. */
export const useStoreItem = (docId) => useTracker(() => {
  const workshops = Meteor.subscribe('admin.storeItems.workshops');
  const item = docId ? Meteor.subscribe('admin.storeItems.item', docId) : null;
  return {
    loading: !workshops.ready() || (item && !item.ready()),
    item: docId ? StoreItems.findOne(docId) : null,
    workshops: Workshops.find({}, { sort: { 'name.sv': 1 } }).fetch(),
  };
}, [docId]);

const number = (value) => (value === '' || value === null || value === undefined ? null : Number(value));

/** The form's values for an item, or empty ones for a new item. Numbers as strings, as fields hold them. */
export const formValues = (item) => ({
  code: item?.code || '',
  nameSv: item?.name?.sv || '',
  nameEn: item?.name?.en || '',
  descriptionSv: item?.description?.sv || '',
  descriptionEn: item?.description?.en || '',
  price: item?.price ?? '',
  minPrice: item?.minPrice ?? '',
  maxPrice: item?.maxPrice ?? '',
  requiresMembership: !!item?.requiresMembership,
  commentRequired: !!item?.commentRequired,
  placeholderSv: item?.commentPlaceholder?.sv || '',
  placeholderEn: item?.commentPlaceholder?.en || '',
  bookkeepingAccount: item?.bookkeepingAccount || '',
  status: item?.status || 'available',
  sortOrder: item?.sortOrder ?? '',
});

const fieldsFrom = (v) => ({
  code: v.code,
  name: { sv: v.nameSv, en: v.nameEn },
  description: { sv: v.descriptionSv, en: v.descriptionEn },
  price: number(v.price),
  minPrice: number(v.minPrice),
  maxPrice: number(v.maxPrice),
  requiresMembership: v.requiresMembership,
  commentRequired: v.commentRequired,
  commentPlaceholder: { sv: v.placeholderSv, en: v.placeholderEn },
  bookkeepingAccount: v.bookkeepingAccount,
  status: v.status,
  sortOrder: number(v.sortOrder),
});

/** Create an item (resolves to its id), or update one if an item is given. */
export const saveStoreItem = (values, item) => (item
  ? Meteor.callAsync('storeItems.update', item._id, fieldsFrom(values), item.updatedAt ?? null)
  : Meteor.callAsync('storeItems.create', fieldsFrom(values)));

export const setStoreItemWorkshops = (docId, workshopIds) => Meteor.callAsync('storeItems.setWorkshops', docId, workshopIds);
export const storeItemSales = (docId) => Meteor.callAsync('storeItems.sales', docId);
export const removeStoreItem = (docId) => Meteor.callAsync('storeItems.remove', docId);
export const removeStoreItemImage = (docId) => Meteor.callAsync('adminStoreItems.removeImage', docId);

/** Upload an image file; the method wants raw base64. */
export const uploadStoreItemImage = (docId, file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(Meteor.callAsync('adminStoreItems.uploadImage', docId, String(reader.result).split(',')[1] || '', file.type));
  reader.onerror = () => reject(new Error('Could not read the file'));
  reader.readAsDataURL(file);
});

/** Where an item's image is served; the file id busts the cache when it changes. */
export const imageUrl = (item) => (item?.imageFileId
  ? `/api/store-items/${item._id}/image?v=${encodeURIComponent(item.imageFileId)}`
  : null);

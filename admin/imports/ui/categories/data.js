import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { Categories } from '/imports/common/collections/categories';
import { categoryFields } from '/imports/common/lib/activityValues';

/** Data for the categories page and the forms that choose among them. */

const byName = (a, b) => (a.name?.sv || '').localeCompare(b.name?.sv || '', 'sv');
const bySortOrder = (a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) || byName(a, b);

export const useCategories = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.categories.list');
  return { loading: !handle.ready(), categories: Categories.find().fetch().sort(bySortOrder) };
}, []);

export const saveCategory = (values, category) => (category
  ? Meteor.callAsync('categories.update', category._id, categoryFields(values), category.updatedAt ?? null)
  : Meteor.callAsync('categories.create', categoryFields(values)));

export const removeCategory = (docId) => Meteor.callAsync('categories.remove', docId);

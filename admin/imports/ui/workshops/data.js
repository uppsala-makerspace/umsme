import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { Workshops } from '/imports/common/collections/workshops';
import { uploadImage } from '../groups/choices';

/**
 * Data for the workshop pages: the narrow publications and the methods. The
 * pages' containers use this; the pure components never do.
 */

export const useWorkshopList = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.workshops.list');
  return { loading: !handle.ready(), workshops: Workshops.find({}, { fields: { name: 1, kind: 1, status: 1, groupId: 1 } }).fetch() };
}, []);

/** One whole workshop; none when there is no id (a new one). */
export const useWorkshop = (docId) => useTracker(() => {
  if (!docId) return { loading: false, workshop: null };
  const handle = Meteor.subscribe('admin.workshops.workshop', docId);
  return { loading: !handle.ready(), workshop: Workshops.findOne(docId) };
}, [docId]);

const bilingual = (doc, field) => ({ [`${field}Sv`]: doc?.[field]?.sv || '', [`${field}En`]: doc?.[field]?.en || '' });

/** The form's values for a workshop, or empty ones for a new one. */
export const formValues = (workshop) => ({
  kind: workshop?.kind || 'workshop',
  ...bilingual(workshop, 'name'),
  ...bilingual(workshop, 'tag'),
  ...bilingual(workshop, 'description'),
  ...bilingual(workshop, 'rules'),
  status: workshop?.status || 'forming',
  slackChannel: workshop?.slackChannel || '',
  guidesUrl: workshop?.guidesUrl || '',
  groupId: workshop?.groupId || '',
  primarySpaceId: workshop?.primarySpaceId || '',
  secondarySpaceIds: workshop?.secondarySpaceIds || [],
});

const pair = (v, field) => ({ sv: v[`${field}Sv`], en: v[`${field}En`] });
const fieldsFrom = (v) => ({
  kind: v.kind,
  name: pair(v, 'name'),
  tag: pair(v, 'tag'),
  description: pair(v, 'description'),
  rules: pair(v, 'rules'),
  status: v.status,
  slackChannel: v.slackChannel,
  guidesUrl: v.guidesUrl,
  groupId: v.groupId || null,
  primarySpaceId: v.primarySpaceId || null,
  secondarySpaceIds: v.secondarySpaceIds,
});

/** Create a workshop (resolves to its id), or update one if a workshop is given. */
export const saveWorkshop = (values, workshop) => (workshop
  ? Meteor.callAsync('workshops.update', workshop._id, fieldsFrom(values), workshop.updatedAt ?? null)
  : Meteor.callAsync('workshops.create', fieldsFrom(values)));

export const workshopDetails = (docId) => Meteor.callAsync('workshops.details', docId);
export const removeWorkshop = (docId) => Meteor.callAsync('workshops.remove', docId);
export const uploadWorkshopImage = (docId, file) => uploadImage('adminWorkshops.uploadImage', docId, file);
export const removeWorkshopImage = (docId) => Meteor.callAsync('adminWorkshops.removeImage', docId);

export const imageUrl = (workshop) => (workshop?.imageFileId
  ? `/api/workshops/${workshop._id}/image?v=${encodeURIComponent(workshop.imageFileId)}`
  : null);

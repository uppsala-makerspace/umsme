import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { Spaces } from '/imports/common/collections/spaces';

/**
 * Data for the space pages: the narrow publications and the methods. The
 * pages' containers use this; the pure components never do.
 */

export const useSpaceList = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.spaces.list');
  return { loading: !handle.ready(), spaces: Spaces.find({}, { sort: { spaceId: 1 } }).fetch() };
}, []);

/** One whole space; none when there is no id (a new space). */
export const useSpace = (docId) => useTracker(() => {
  if (!docId) return { loading: false, space: null };
  const handle = Meteor.subscribe('admin.spaces.space', docId);
  return { loading: !handle.ready(), space: Spaces.findOne(docId) };
}, [docId]);

/** The form's values for a space, or empty ones for a new space. */
export const formValues = (space) => ({
  spaceId: space?.spaceId || '',
  floor: space?.floor || 'floor1',
  nameSv: space?.name?.sv || '',
  nameEn: space?.name?.en || '',
  descriptionSv: space?.description?.sv || '',
  descriptionEn: space?.description?.en || '',
  slackChannels: (space?.slackChannels || []).join(', '),
  iconSize: space?.iconSize ?? '',
});

const fieldsFrom = (v) => ({
  spaceId: v.spaceId,
  floor: v.floor,
  name: { sv: v.nameSv, en: v.nameEn },
  description: { sv: v.descriptionSv, en: v.descriptionEn },
  slackChannels: v.slackChannels.split(',').map((c) => c.trim()).filter(Boolean),
  iconSize: v.iconSize === '' ? null : Number(v.iconSize),
});

/** Create a space (resolves to its id), or update one if a space is given. */
export const saveSpace = (values, space) => (space
  ? Meteor.callAsync('spaces.update', space._id, fieldsFrom(values), space.updatedAt ?? null)
  : Meteor.callAsync('spaces.create', fieldsFrom(values)));

export const spaceLinks = (docId) => Meteor.callAsync('spaces.links', docId);
export const removeSpace = (docId) => Meteor.callAsync('spaces.remove', docId);
export const importSpaces = () => Meteor.callAsync('adminSpaces.importFromRooms');
export const removeSpaceIcon = (docId) => Meteor.callAsync('adminSpaces.removeIcon', docId);

/** Upload an icon file; the method wants raw base64. */
export const uploadSpaceIcon = (docId, file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(Meteor.callAsync('adminSpaces.uploadIcon', docId, String(reader.result).split(',')[1] || '', file.type));
  reader.onerror = () => reject(new Error('Could not read the file'));
  reader.readAsDataURL(file);
});

/** Where a space's icon is served; the file id busts the cache when it changes. */
export const iconUrl = (space) => (space?.iconFileId
  ? `/api/spaces/${space._id}/icon?v=${encodeURIComponent(space.iconFileId)}`
  : null);

import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { Groups } from '/imports/common/collections/groups';
import { Workshops } from '/imports/common/collections/workshops';
import { Spaces } from '/imports/common/collections/spaces';

const FLOORS = { floor1: 'Floor 1', floor2: 'Floor 2' };
const byName = (a, b) => (a.name?.sv || '').localeCompare(b.name?.sv || '', 'sv');

/**
 * What the group and workshop pages link to and choose among: groups,
 * workshops and spaces, by name, ready to be offered as choices.
 */
export const useChoices = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.groupsAndWorkshops.choices');
  const groups = Groups.find({}, { fields: { name: 1, type: 1, parentGroupId: 1 } }).fetch().sort(byName);
  const workshops = Workshops.find({}, { fields: { name: 1, kind: 1, groupId: 1 } }).fetch().sort(byName);
  const spaces = Spaces.find({}, { fields: { name: 1, floor: 1 } }).fetch().sort(byName);
  return {
    loading: !handle.ready(),
    groups,
    workshops,
    spaceOptions: spaces.map((s) => ({ value: s._id, label: `${s.name?.sv || s._id} (${FLOORS[s.floor] || s.floor})`, group: FLOORS[s.floor] })),
    workshopOptions: workshops.map((w) => ({ value: w._id, label: w.name?.sv || w._id, group: w.kind === 'areaOfInterest' ? 'Areas of interest' : 'Workshops' })),
    groupName: (id) => groups.find((g) => g._id === id)?.name?.sv,
  };
}, []);

/** Names and member numbers for member ids, looked up on the server. */
export const memberNames = (ids) => (ids.length ? Meteor.callAsync('adminMembers.names', ids) : Promise.resolve([]));

export const searchMembers = (query) => Meteor.callAsync('adminMembers.search', query);

/** Upload an image file to a method that wants raw base64. */
export const uploadImage = (method, docId, file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(Meteor.callAsync(method, docId, String(reader.result).split(',')[1] || '', file.type));
  reader.onerror = () => reject(new Error('Could not read the file'));
  reader.readAsDataURL(file);
});

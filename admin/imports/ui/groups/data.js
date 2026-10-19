import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { Groups } from '/imports/common/collections/groups';
import { GroupMemberships } from '/imports/common/collections/groupMemberships';
import { getLinkableRoleOptions } from '/imports/common/lib/models';
import { uploadImage } from './choices';

/**
 * Data for the group pages: the narrow publications and the methods. The
 * pages' containers use this; the pure components never do.
 */

export const useGroupList = () => useTracker(() => {
  const handle = Meteor.subscribe('admin.groups.list');
  return { loading: !handle.ready(), groups: Groups.find({}, { fields: { name: 1, type: 1, allowJoinRequests: 1, joinPolicy: 1 } }).fetch() };
}, []);

/** One whole group and its memberships; none when there is no id (a new group). */
export const useGroup = (docId) => useTracker(() => {
  if (!docId) return { loading: false, group: null, memberships: [] };
  const group = Meteor.subscribe('admin.groups.group', docId);
  const memberships = Meteor.subscribe('admin.groups.memberships', docId);
  return {
    loading: !group.ready() || !memberships.ready(),
    group: Groups.findOne(docId),
    memberships: GroupMemberships.find({ groupId: docId }, { fields: { memberId: 1, state: 1 } }).fetch(),
  };
}, [docId]);

/** The roles a group may grant its members (never admin). */
export const useRoleOptions = () => useTracker(() => getLinkableRoleOptions(), []);

const bilingual = (doc, field) => ({ [`${field}Sv`]: doc?.[field]?.sv || '', [`${field}En`]: doc?.[field]?.en || '' });

/** The form's values for a group, or empty ones for a new group. */
export const formValues = (group) => ({
  ...bilingual(group, 'name'),
  ...bilingual(group, 'tag'),
  ...bilingual(group, 'description'),
  ...bilingual(group, 'rules'),
  type: group?.type || '',
  parentGroupId: group?.parentGroupId || '',
  slackChannel: group?.slackChannel || '',
  guidesUrl: group?.guidesUrl || '',
  responsibleMemberId: group?.responsibleMemberId || '',
  allowJoinRequests: group ? group.allowJoinRequests !== false : true,
  joinPolicy: group?.joinPolicy || 'request-responsible',
  linkedRole: group?.linkedRole || '',
  primarySpaceId: group?.primarySpaceId || '',
  secondarySpaceIds: group?.secondarySpaceIds || [],
  relatedWorkshopIds: group?.relatedWorkshopIds || [],
  relatedGroupIds: group?.relatedGroupIds || [],
});

const pair = (v, field) => ({ sv: v[`${field}Sv`], en: v[`${field}En`] });
const fieldsFrom = (v) => ({
  name: pair(v, 'name'),
  tag: pair(v, 'tag'),
  description: pair(v, 'description'),
  rules: pair(v, 'rules'),
  type: v.type,
  // A steering group has no parent; the field is hidden for it.
  parentGroupId: v.type === 'steering' ? null : v.parentGroupId || null,
  slackChannel: v.slackChannel,
  guidesUrl: v.guidesUrl,
  responsibleMemberId: v.responsibleMemberId || null,
  allowJoinRequests: v.allowJoinRequests,
  joinPolicy: v.joinPolicy,
  linkedRole: v.linkedRole || null,
  primarySpaceId: v.primarySpaceId || null,
  secondarySpaceIds: v.secondarySpaceIds,
  relatedWorkshopIds: v.relatedWorkshopIds,
  relatedGroupIds: v.relatedGroupIds,
});

/** Create a group (resolves to its id), or update one if a group is given. */
export const saveGroup = (values, group) => (group
  ? Meteor.callAsync('groups.update', group._id, fieldsFrom(values), group.updatedAt ?? null)
  : Meteor.callAsync('groups.create', fieldsFrom(values)));

export const groupReferences = (docId) => Meteor.callAsync('groups.references', docId);
export const removeGroup = (docId) => Meteor.callAsync('groups.remove', docId);
export const addGroupMember = (docId, memberId) => Meteor.callAsync('groups.addMember', docId, memberId);
export const rejectGroupRequest = (docId, memberId) => Meteor.callAsync('groups.rejectRequest', docId, memberId);
export const removeGroupMember = (docId, memberId) => Meteor.callAsync('groups.removeMember', docId, memberId);
export const uploadGroupImage = (docId, file) => uploadImage('adminGroups.uploadImage', docId, file);
export const removeGroupImage = (docId) => Meteor.callAsync('adminGroups.removeImage', docId);

export const imageUrl = (group) => (group?.imageFileId
  ? `/api/groups/${group._id}/image?v=${encodeURIComponent(group.imageFileId)}`
  : null);

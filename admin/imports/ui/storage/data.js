import { Meteor } from 'meteor/meteor';
import { useTracker } from 'meteor/react-meteor-data';
import { Roles } from 'meteor/roles';
import { STORAGE_OPERATOR_ROLES } from '/imports/common/lib/storageRules';
import { Members } from '/imports/common/collections/members';
import { Messages } from '/imports/common/collections/messages';
import {
  StorageWalls, StorageUnits, StorageRequests, StorageOffers, StorageEvents,
} from '/imports/common/collections/storage';

/**
 * Data for the storage page: the storage publications, which already are
 * the narrow ones for this page, and the adminStorage methods. The page's
 * container uses this; the sections never do.
 */

export const useOperator = () => useTracker(() => !!Meteor.userId() && Roles.userIsInRole(Meteor.userId(), STORAGE_OPERATOR_ROLES), []);

/** Everything the dashboard shows, kept current. */
export const useStorageDashboard = (operator) => useTracker(() => {
  if (!operator) return { loading: false };
  const handle = Meteor.subscribe('storageAdminDashboard');
  return {
    loading: !handle.ready(),
    walls: StorageWalls.find({}, { sort: { display_order: 1, name: 1 } }).fetch(),
    units: StorageUnits.find().fetch(),
    requests: StorageRequests.find().fetch(),
    offers: StorageOffers.find().fetch(),
    members: Members.find({}, { sort: { name: 1 } }).fetch(),
    users: Meteor.users.find().fetch(),
    messages: Messages.find({ type: 'storage' }, { sort: { senddate: -1 } }).fetch(),
  };
}, [operator]);

/** The event log, filtered to a member and a unit if given. */
export const useStorageEvents = (operator, filters) => useTracker(() => {
  if (!operator) return [];
  Meteor.subscribe('storageAdminEventLog', {
    ...(filters.member_id ? { member_id: filters.member_id } : {}),
    ...(filters.unit_id ? { unit_id: filters.unit_id } : {}),
  });
  return StorageEvents.find({}, { sort: { occurred_at: -1 } }).fetch();
}, [operator, filters.member_id, filters.unit_id]);

/** The history of a unit and what is attached to it. */
export const useStorageHistory = (entityIds) => useTracker(() => {
  if (!entityIds.length) return [];
  Meteor.subscribe('storageAdminHistory', entityIds);
  return StorageEvents.find({
    $or: [{ entity_id: { $in: entityIds } }, { unit: entityIds[0] }, { related_unit: entityIds[0] }],
  }, { sort: { occurred_at: -1 }, limit: 50 }).fetch();
}, [entityIds.join(',')]);

export const storageReadiness = () => Meteor.callAsync('adminStorage.readiness');
export const storagePreview = (action) => Meteor.callAsync('adminStorage.preview', { action });

/** Call an adminStorage command; payload carries its command_id. */
export const storageCommand = (method, payload) => Meteor.callAsync(method, payload);

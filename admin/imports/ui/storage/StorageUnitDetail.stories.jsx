import { fn } from 'storybook/test';
import { StorageUnitDetail } from './StorageUnitDetail';
import { storyUnits, storyWalls, storyMembers } from './fixtures';

const on = Object.fromEntries(['saveMetadata', 'confirmClearance', 'assign', 'markReturned', 'createExemption', 'revokeExemption', 'requestRelease', 'togglePause', 'cancelRequest', 'completeOffer', 'extendOffer', 'cancelOffer'].map((k) => [k, fn()]));
const history = [{ _id: 'e1', occurred_at: new Date(Date.now() - 5 * 86400000), event_type: 'warning_sent', reason: 'Lab membership ended' }];

export default {
  title: 'Storage/StorageUnitDetail',
  component: StorageUnitDetail,
  args: { walls: storyWalls, members: storyMembers, messages: [], history: [], canRequestRelease: false, on },
};

export const Overdue = { args: { unit: storyUnits[1], ownerName: 'Vera Varnad', history, messages: [{ _id: 'x', senddate: new Date(), subject: 'Ditt lagringsfack' }] } };
export const Available = { args: { unit: storyUnits[3], ownerName: 'No owner' } };
export const AwaitingClearance = { args: { unit: storyUnits[2], ownerName: 'Rolf Rensning' } };
export const Exempt = { args: { unit: { ...storyUnits[0], exemption: { reason: 'Board decision' } }, ownerName: 'Fredrik Familj', canRequestRelease: true } };

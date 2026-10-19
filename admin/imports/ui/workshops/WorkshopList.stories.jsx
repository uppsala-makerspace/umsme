import { WorkshopList } from './WorkshopList';

const groups = { g1: 'Styrgrupp Keramik', g2: 'Styrgrupp Trä' };
const workshops = [
  { _id: 'w1', name: { sv: 'Keramikverkstaden' }, kind: 'workshop', status: 'established', groupId: 'g1' },
  { _id: 'w2', name: { sv: 'Träverkstaden' }, kind: 'workshop', status: 'trial', groupId: 'g2' },
  { _id: 'w3', name: { sv: 'Retrodatorer' }, kind: 'areaOfInterest', status: 'trial' },
  { _id: 'w4', name: { sv: 'Smyckesverkstad' }, status: 'forming' },
];

export default {
  title: 'Workshops/WorkshopList',
  component: WorkshopList,
  args: { loading: false, workshops, groupName: (id) => groups[id] },
};

export const Workshops = {};
export const Loading = { args: { loading: true, workshops: [] } };
export const NoWorkshops = { args: { workshops: [] } };

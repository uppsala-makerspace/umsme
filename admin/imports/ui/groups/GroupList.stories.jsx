import { GroupList } from './GroupList';

const groups = [
  { _id: 'g1', name: { sv: 'Styrgrupp Keramik' }, type: 'steering', allowJoinRequests: false, joinPolicy: 'request-any' },
  { _id: 'g2', name: { sv: 'Lokalgruppen' }, type: 'function', joinPolicy: 'request-responsible' },
  { _id: 'g3', name: { sv: 'Glasyrgruppen' }, type: 'responsibility', joinPolicy: 'open' },
];

export default {
  title: 'Groups/GroupList',
  component: GroupList,
  args: { loading: false, groups },
};

export const Groups = {};
export const Loading = { args: { loading: true, groups: [] } };
export const NoGroups = { args: { groups: [] } };

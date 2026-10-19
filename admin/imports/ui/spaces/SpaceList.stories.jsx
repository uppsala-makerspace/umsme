import { fn } from 'storybook/test';
import { SpaceList } from './SpaceList';

const spaces = [
  { _id: 's1', spaceId: 'woodworkshop', floor: 'floor1', name: { sv: 'Träverkstaden', en: 'Wood workshop' }, iconFileId: 'x', iconSize: 40 },
  { _id: 's2', spaceId: 'bigroom', floor: 'floor1', name: { sv: 'Stora rummet' } },
  { _id: 's3', spaceId: 'ceramics_workshop', floor: 'floor2', name: { sv: 'Keramikverkstaden' }, iconFileId: 'y' },
  { _id: 's4', spaceId: 'kitchen', floor: 'floor2', name: { sv: 'Köket' } },
];

export default {
  title: 'Spaces/SpaceList',
  component: SpaceList,
  args: { loading: false, spaces, onImport: fn() },
};

export const Spaces = {};
export const Imported = { args: { importResult: { imported: 12, skipped: 4, icons: 10 } } };
export const Loading = { args: { loading: true, spaces: [] } };
export const NoSpaces = { args: { spaces: [] } };

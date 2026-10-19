import { LiabilityList } from './LiabilityList';

const day = (iso) => new Date(`${iso}T00:00:00Z`);

const versions = [
  { _id: 'v3', title: 'Ansvarsförbindelse 2025', date: day('2025-09-14') },
  { _id: 'v2', title: 'Ansvarsförbindelse 2023', date: day('2023-05-02') },
  { _id: 'v1', title: 'Ansvarsförbindelse 2019', date: day('2019-01-10') },
];

export default {
  title: 'Liability/LiabilityList',
  component: LiabilityList,
  args: { loading: false, documents: versions },
};

/** The versions, newest first; the top one is the version in force. */
export const Versions = {};

export const Loading = { args: { loading: true, documents: [] } };

export const NoVersions = { args: { documents: [] } };

export const LongTitle = {
  args: {
    documents: [
      { _id: 'long', title: 'Ansvarsförbindelse för medlemmar som använder verkstäderna utanför bemannade öppettider, 2025', date: day('2025-09-14') },
      ...versions.slice(1),
    ],
  },
};

/** More versions than fit on a page, to show paging, searching and sorting. */
export const ManyVersions = {
  args: {
    documents: Array.from({ length: 40 }, (_, i) => ({
      _id: `many-${i}`,
      title: `Ansvarsförbindelse ${1990 + i}`,
      date: day(`${1990 + i}-01-15`),
    })),
  },
};

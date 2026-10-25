import { ActivityList } from './ActivityList';
import { activities, categories, groupName, workshopOptions } from './fixtures';

export default {
  title: 'Activities/ActivityList',
  component: ActivityList,
  args: {
    loading: false, activities, groupName,
    categoryName: (id) => categories.find((c) => c._id === id)?.name?.sv,
    workshopName: (id) => workshopOptions.find((w) => w.value === id)?.label,
  },
};

export const Some = {};
export const Empty = { args: { activities: [] } };

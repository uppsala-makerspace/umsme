import { revenueModel } from '/imports/stats/revenueModel';
import { Revenue } from './Revenue';
import { storyMemberships, storyPayments, storyNow } from './fixtures';

const model = revenueModel(storyPayments, Object.fromEntries(storyMemberships.map((m) => [m._id, m])), storyNow);

export default {
  title: 'Statistics/Revenue',
  component: Revenue,
  args: { model },
};

export const Revenue_ = { name: 'Revenue' };
export const Counting = { args: { model: null } };

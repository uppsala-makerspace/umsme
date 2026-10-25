import { fn } from 'storybook/test';
import { CategoryList } from './CategoryList';
import { categories } from './fixtures';

export default {
  title: 'Activities/CategoryList',
  component: CategoryList,
  args: { loading: false, categories, usage: (id) => (id === 'c1' ? 2 : 0), onSave: fn(async () => true), onDelete: fn() },
};

export const Some = {};
export const Failed = { args: { error: 'The category can not be deleted while activities or events have it' } };

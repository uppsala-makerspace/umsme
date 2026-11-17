import { fn } from 'storybook/test';
import { CategoryList } from './CategoryList';
import { categories } from '../activities/fixtures';

export default {
  title: 'Categories/CategoryList',
  component: CategoryList,
  args: { loading: false, categories, usage: (id) => (id === 'c1' ? 2 : 0), onSave: fn(async () => true), onDelete: fn() },
};

export const Some = {};
export const Failed = { args: { error: 'The category can not be deleted while activities, events, groups or workshops have it' } };

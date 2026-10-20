import { fn } from 'storybook/test';
import { UserAdd } from './UserAdd';

export default { title: 'Users/UserAdd', component: UserAdd, args: { onAdd: fn() } };

export const Empty = {};
export const Taken = { args: { error: 'Username already exists.' } };

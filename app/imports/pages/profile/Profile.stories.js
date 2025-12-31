import { fn } from 'storybook/test';
import Profile from './Profile';

export default {
  title: 'UMSAPP/Profile',
  component: Profile,
  parameters: {},
  tags: ['autodocs']
};

export const Empty = {
  args: {
    onSubmit: fn()
  }
};

export const WithInitialValues = {
  args: {
    onSubmit: fn(),
    initialName: 'John Doe',
    initialMobile: '0701234567',
    initialBirthyear: '1990'
  }
};

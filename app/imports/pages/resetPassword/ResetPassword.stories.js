import { fn } from 'storybook/test';
import ResetPassword from './ResetPassword';

export default {
  title: 'UMSAPP/ResetPassword',
  component: ResetPassword,
  parameters: {},
  tags: ['autodocs']
};

export const Default = {
  args: {
    onSubmit: fn()
  }
};

export const WithErrorMessage = {
  args: {
    message: 'Something went wrong, please try again.',
    onSubmit: fn()
  }
};

import { fn } from 'storybook/test';
import ForgotPassword from './ForgotPassword';

export default {
  title: 'UMSAPP/ForgotPassword',
  component: ForgotPassword,
  parameters: {},
  tags: ['autodocs']
};

export const Default = {
  args: {
    onSubmit: fn()
  }
};

export const WithSuccessMessage = {
  args: {
    message: 'Sent reset email to: test@example.com',
    onSubmit: fn()
  }
};

export const WithErrorMessage = {
  args: {
    message: 'Could not send email: User not found',
    onSubmit: fn()
  }
};

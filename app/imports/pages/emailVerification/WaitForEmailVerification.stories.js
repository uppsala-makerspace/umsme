import { fn } from 'storybook/test';
import WaitForEmailVerification from './WaitForEmailVerification';

export default {
  title: 'UMSAPP/WaitForEmailVerification',
  component: WaitForEmailVerification,
  parameters: {},
  tags: ['autodocs']
};

export const Default = {
  args: {
    onSendVerification: fn()
  }
};

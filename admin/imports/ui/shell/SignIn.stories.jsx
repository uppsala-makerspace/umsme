import { fn } from 'storybook/test';
import { SignIn } from './SignIn';

export default { title: 'Shell/SignIn', component: SignIn, args: { onSignIn: fn() } };

export const Password = {};
export const WithGoogle = { args: { onGoogle: fn() } };
export const Refused = { args: { error: 'Wrong username or password.' } };

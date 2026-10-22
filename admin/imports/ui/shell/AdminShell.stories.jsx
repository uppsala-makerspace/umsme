import React from 'react';
import { fn } from 'storybook/test';
import Typography from '@mui/material/Typography';
import { AdminShell } from './AdminShell';
import { SignIn } from './SignIn';
import { Home } from './Home';

export default {
  title: 'Shell/AdminShell',
  component: AdminShell,
  args: { user: 'admin@example.org', roles: ['admin'], path: '/members', onSignOut: fn(), onChangePassword: fn(async () => {}), children: <Home />, signIn: <SignIn onSignIn={fn()} /> },
};

export const Staff = {};
export const StorageOnly = { args: { user: 'storage@example.org', roles: ['storage'], path: '/storage', children: <Typography variant="h4" component="h1">Storage</Typography> } };
export const SignedOut = { args: { user: null, roles: [] } };
export const SignedOutWithGoogle = { args: { user: null, roles: [], signIn: <SignIn onSignIn={fn()} onGoogle={fn()} /> } };
export const NoAccess = { args: { user: 'member@example.org', roles: [] } };
export const Narrow = { globals: { viewport: { value: 'mobile1' } }, parameters: { viewport: { defaultViewport: 'mobile1' } } };

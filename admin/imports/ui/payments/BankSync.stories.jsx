import { fn } from 'storybook/test';
import { BankSync } from './BankSync';

const QR = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export default {
  title: 'Payments/BankSync',
  component: BankSync,
  args: { pnr: '199001011234', status: 'uninitiated', onSavePnr: fn(), onSignIn: fn(), onSignOut: fn(), onSynchronize: fn() },
};

export const NoPersonalNumber = { args: { pnr: '' } };
export const SignedOut = {};
export const Waiting = { args: { status: 'waiting', qr: QR } };
export const Synchronized = { args: { status: 'ready', result: { added: 2, total: 18 } } };
export const ProxyDown = { args: { status: 'error: fetch failed', error: 'fetch failed' } };

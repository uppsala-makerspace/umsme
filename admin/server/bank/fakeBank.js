import { FakeBankState, FAKE_BANK_ID } from '/imports/common/server/fakeBankApi';

/**
 * A stand-in for the bank proxy (swedbankProxy.js) with its state in the
 * database, so that development, the demo and the e2e tests can sign in and
 * synchronize without a bank. Chosen with "bankproxy": "fake"; the seeds give
 * it its transactions (common/server/seed/bank.js). A sign-in is waiting
 * until the next check, as if the QR code had been scanned at once.
 */

// A 1×1 PNG: the QR code a real sign-in shows.
const QR = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const state = async () => (await FakeBankState.findOneAsync(FAKE_BANK_ID)) || { transactions: [], sessions: {} };
const setSession = (pnr, status) => FakeBankState.upsertAsync(FAKE_BANK_ID, { $set: { [`sessions.${pnr}`]: status } });

export const fakeBank = {
  async check(pnr) {
    const status = (await state()).sessions?.[pnr] || 'uninitiated';
    if (status === 'waiting') {
      await setSession(pnr, 'ready');
      return { status: 'waiting' };
    }
    return { status };
  },
  async initiate(pnr) {
    await setSession(pnr, 'waiting');
    return QR;
  },
  async clear(pnr) {
    await setSession(pnr, 'uninitiated');
  },
  async transactions() {
    return (await state()).transactions.map(({ swish, ...tr }) => tr);
  },
  async transaction(pnr, id) {
    return (await state()).transactions.find((tr) => tr.details.id === id)?.swish || { message: '', swishDetails: {} };
  },
};

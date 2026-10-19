import { FakeBankState, FAKE_BANK_ID } from '/imports/common/server/fakeBankApi';

const kronor = (n) => n.toFixed(2).replace('.', ',');

/**
 * The fake bank's transactions for a scenario (see
 * common/server/fakeBankApi.js): deposits, in the shape the Swedbank proxy
 * gives them, Swish ones with the payer's name, number and message.
 *
 * @param {Array<{ amount: number, date: Date, swish?: { name, mobile, message } }>} deposits
 */
export const makeFakeBank = async (deposits) => {
  let balance = 100000;
  const transactions = deposits.map((d, i) => {
    balance += d.amount;
    return {
      amount: kronor(d.amount),
      date: d.date.toISOString().slice(0, 10),
      accountingBalance: { amount: kronor(balance) },
      details: {
        id: `fake-tr-${i}`, transactionType: 'Insättning', category: d.swish ? 'SWISH' : 'BANKGIRO',
        reference: d.swish ? '1234567890' : `BG ${i}`, bankReference: `fake-ref-${i}`,
      },
      swish: d.swish ? { message: d.swish.message, swishDetails: { payersName: d.swish.name, sendersNumber: d.swish.mobile, transactionTime: d.date.toISOString() } } : null,
    };
  });
  await FakeBankState.removeAsync({});
  await FakeBankState.insertAsync({ _id: FAKE_BANK_ID, transactions, sessions: {} });
};

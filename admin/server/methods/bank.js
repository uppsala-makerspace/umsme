import { fetch, Headers } from 'meteor/fetch';
import { Payments } from '/imports/common/collections/payments';

const pnr2sessionID = {};
const getPnr = async () => {
  const user = await Meteor.userAsync();
  return (user.profile || {}).pnr;
};
const extractSessionId = async (resultResponse) => {
  let cookies = (resultResponse.headers.get('set-cookie') || '').split(';').map(s => s.trim());
  if (cookies.length > 0) {
    cookies = cookies.filter(cookie => cookie.indexOf('PHPSESSID=') === 0 );
    if (cookies.length > 0) {
      const pnr = await getPnr();
      pnr2sessionID[pnr] = cookies[0].substring(10);
    }
  }
};
const addCookie = async (headerOptions) => {
  const sessionID = pnr2sessionID[await getPnr()];
  if (sessionID) {
    headerOptions.Cookie = `PHPSESSID=${sessionID}`
  }
  return headerOptions;
};

const excludeTransactions = (transactions) => transactions.filter(tr =>
  tr.details.transactionType === 'Insättning');

const extractTransactions = (transactions) => transactions.map(tr => {
  let hash = `${tr.amount}${tr.date}${tr.accountingBalance.amount}`.replace(/[\s-\.,]/g, '');
  if (Meteor.settings.newBankHashDate
    && new Date(tr.date) > new Date(Meteor.settings.newBankHashDate)
    && tr.details.category === "SWISH") {
    hash = `${tr.amount}${tr.date}${tr.details.bankReference}`.replace(/[\s-\.,]/g, '');
  }
  return {
    id: tr.details.id,
    hash,
    type: tr.details.category === 'SWISH' ? 'swish' : 'bankgiro',
    amount: parseFloat(tr.amount.replace(/\s/g, '')),
    date: new Date(tr.date),
  };
});

Meteor.methods({
  'setPnr': async (pnr) => {
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      Meteor.users.updateAsync(Meteor.userId(), { $set: { profile: { pnr } } });
    }
  },
  'clearSession': async () =>  {
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      pnr2sessionID[await getPnr()] = undefined;
    }
  },
  'checkBank': async () => {
    const base = Meteor.settings.bankproxy;
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      const headers = new Headers(await addCookie({}));
      const checkRequest = await fetch(`${base}check.php`, { headers })
      extractSessionId(checkRequest);
      return checkRequest.json();
    }
  },
  'initiateBank': async () => {
    const base = Meteor.settings.bankproxy;
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      const pnr = await getPnr();
      const headers = new Headers(await addCookie({}));
      const initiateRequest = await fetch(`${base}initiate.php?pnr=${pnr}&base64=true`, { headers })
      return initiateRequest.text();
    }
  },
  'synchronize': async () => {
    const base = Meteor.settings.bankproxy;
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      const headers = new Headers(await addCookie({}));
      const transactionsRequest = await fetch(`${base}transactions.php`, { headers });
      const result = await transactionsRequest.json();
      const transactions = extractTransactions(excludeTransactions(result.transactions));
      let added = 0;
      for (let idx = 0; idx < transactions.length; idx++) {
        const tr = transactions[idx];
        if (idx > Meteor.settings.syncNrOfTransactions) {
          return;
        }
        const payment = await Payments.findOneAsync({ hash: tr.hash });
        if (!payment) {
          if (tr.type === 'swish') {
            const transactionRequest = await fetch(`${base}transaction.php?id=${tr.id}`, { headers });
            const result = await transactionRequest.json();
            tr.message = result.message;
            const swd = result.swishDetails;
            tr.clarification = `Payers name: ${swd.payersName} via ${swd.sendersNumber} at ${swd.transactionTime}`;
            if (swd.sendersNumber) {
              tr.mobile = swd.sendersNumber;
            }
            if (swd.payersName) {
              tr.name = swd.payersName;
            }
          }
          // Temporary id, we keep it temporarily to be able to do the detailed transaction lookup above
          // But we do not store it, since it is unique to each session and worthless in the database
          delete tr.id;
          added += 1;
          await Payments.insertAsync(tr);
        }
      }
      return {
        added,
        total: transactions.length - added,
      }
    }
  }});

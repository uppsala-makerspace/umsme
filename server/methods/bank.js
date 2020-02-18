import { HTTP } from 'meteor/http';
import { Payments } from '/collections/payments';

const pnr2sessionID = {};
let sessionID;
const addCookie = (options) => {
  options.headers = options.headers || {};
  const sessionID = pnr2sessionID[getPnr()];
  if (sessionID) {
    options.headers.Cookie = `PHPSESSID=${sessionID}`
  }
  return options;
};
const getPnr = () => {
  return Meteor.users.findOne(Meteor.userId()).profile.pnr;
};
const extractSessionId = (result) => {
  let cookies = result.headers['set-cookie'];
  if (cookies && Array.isArray(cookies) && cookies.length > 0) {
    cookies = cookies.filter(cookie => cookie.indexOf('PHPSESSID=') === 0 );
    if (cookies.length > 0) {
      let cookie = cookies[0].substr(10);
      cookie = cookie.indexOf(';') ? cookie.split(';')[0] : cookie;
      pnr2sessionID[getPnr()] = cookie;
    }
  }
};

const base = Meteor.settings.bankproxy;

const excludeTransactions = (transactions) => transactions.filter(tr =>
  tr.details.transactionType === 'Insättning');

const extractTransactions = (transactions) => transactions.map(tr => ({
  id: tr.details.id,
  hash: `${tr.amount}${tr.date}${tr.accountingBalance.amount}`.replace(/[\s-\.,]/g, ''),
  type: tr.details.category === 'SWISH' ? 'swish' : 'bankgiro',
  amount: parseFloat(tr.amount.replace(/\s/g, '')),
  date: new Date(tr.date),
}));

Meteor.methods({
  'setPnr': (pnr) => {
    if (Meteor.userId()) {
      Meteor.users.update(Meteor.userId(), { $set: { profile: { pnr } } });
    }
  },
  'clearSession': () =>  {
    if (Meteor.userId()) {
      pnr2sessionID[getPnr()] = undefined;
    }
  },
  'checkBank': () => {
    if (Meteor.userId()) {
      const result = HTTP.call('get', `${base}check.php`, addCookie({}));
      extractSessionId(result);
      return result.data;
    }
  },
  'initiateBank': () => {
    if (Meteor.userId()) {
      const user = Meteor.users.findOne(Meteor.userId());
      const result = HTTP.call('get', `${base}initiate.php?pnr=${user.profile.pnr}`, addCookie({}));
      return result.data.status;
    }
  },
  'synchronize': () => {
    if (Meteor.userId()) {
      const result = HTTP.call('get', `${base}transactions.php`, addCookie({}));
      const transactions = extractTransactions(excludeTransactions(result.data.transactions));
      let added = 0;
      transactions.forEach((tr, idx) => {
        if (idx > Meteor.settings.syncNrOfTransactions) {
          return;
        }
        const payment = Payments.findOne({ hash: tr.hash });
        if (!payment) {
          if (tr.type === 'swish') {
            const result = HTTP.call('get', `${base}transaction.php?id=${tr.id}`, addCookie({}));
            tr.message = result.data.message;
            const swd = result.data.swishDetails;
            tr.clarification = `Payers name: ${swd.payersName} via ${swd.sendersNumber} at ${swd.transactionTime}`;
          }
          // Temporary id, we keep it temporarily to be able to do the detailed transaction lookup above
          // But we do not store it, since it is unique to each session and worthless in the database
          delete tr.id;
          added += 1;
          Payments.insert(tr);
        }
      });
      return {
        added,
        total: transactions.length - added,
      }
    }
  },
  'transactions': () => {
    if (Meteor.userId()) {
      const result = HTTP.call('get', `${base}transactions.php`, addCookie({}));
      return result.data;
    }
  },
  'transaction': (id) => {
    if (Meteor.userId()) {
      const result = HTTP.call('get', `${base}transaction.php?id=${id}`, addCookie({}));
      return result.data;
    }
  },
});

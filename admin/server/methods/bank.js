import { bankApi } from '../bank';
import { Payments } from '/imports/common/collections/payments';

const getPnr = async () => {
  const user = await Meteor.userAsync();
  return (user.profile || {}).pnr;
};

const excludeTransactions = (transactions) => {
  const automaticSwishNumber = Meteor.settings.automaticSwishNumber;
  return transactions.filter(tr =>
    tr.details.transactionType === 'Insättning'
    && (!automaticSwishNumber || tr.details.reference !== automaticSwishNumber));
};

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
      await bankApi().clear(await getPnr());
    }
  },
  'checkBank': async () => {
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      return bankApi().check(await getPnr());
    }
  },
  'initiateBank': async () => {
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      return bankApi().initiate(await getPnr());
    }
  },
  'synchronize': async () => {
    if (Meteor.userId() && await Roles.userIsInRoleAsync(Meteor.userId(), 'admin')) {
      const pnr = await getPnr();
      const transactions = extractTransactions(excludeTransactions(await bankApi().transactions(pnr)));
      let added = 0;
      for (let idx = 0; idx < transactions.length; idx++) {
        const tr = transactions[idx];
        if (idx > Meteor.settings.syncNrOfTransactions) {
          return;
        }
        const payment = await Payments.findOneAsync({ hash: tr.hash });
        if (!payment) {
          if (tr.type === 'swish') {
            const result = await bankApi().transaction(pnr, tr.id);
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

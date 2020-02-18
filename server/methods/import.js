import { utils } from '/lib/utils';
import { membershipFromPayment } from '/lib/rules';
import { Members } from '/collections/members.js';
import { Memberships } from '/collections/memberships.js';

const extractPayment = (row, offset, first, alreadyOnlyMember) => {
  if (row[offset] && row[offset] !== '') {
    return membershipFromPayment(row[offset], row[offset + 1], first, alreadyOnlyMember);
  }
};

const extractPayments = (row) => {
  const payments = [];
  let offset = 12;
  let payment = extractPayment(row, offset, true, false);
  while (payment) {
    payments.push(payment);
    offset += 3;
    payment = extractPayment(row, offset, false, payment.type.indexOf('lab') === 0);
  }
  return payments;
};


Meteor.methods({
  'importData': () => {
    if (Meteor.userId()) {
      console.log("Restoring");
      const csvtext = Assets.getText('members.csv');
      const data = Papa.parse(csvtext);
      const rows = data.data.filter((row) => (row[2] && row[2] !== ''));
      console.log(rows.length);
      const mid2family = {};

      rows.forEach((row, idx) => {
        // Avoid first row with column headers
        if (idx === 0) {
          return;
        }
        const medlem = row[6];
        if (medlem !== "Individ" && medlem !== "Familj" && medlem !== "Ungdom") {
          mid2family[row[1]] = medlem;
        }
        let email = row[4] && row[4].indexOf('@') > -1 ? `${row[4]}` : undefined;
        if (email) {
          email = email.split(/[,;]/);
          if (email.length > 1) {
            console.log(`Member: ${row[2]} ${row[3]} has multiple emails, taking the first: ${email.join(', ')}`);
          }
          email = email[0];
        }
        let lock = row[5];
        if (lock) {
          lock = lock.split(/[,;]/);
          if (lock.length > 1) {
            console.log(`Member: ${row[2]} ${row[3]} has multiple locks, taking the first: ${lock.join(', ')}`);
          }
          lock = lock[0];
        }
        let liability = row[11] != null && row[11] != '';
        const existingmemeber = Members.findOne({ mid: row[1] });
        if (!existingmemeber) {
          try {
            const memberId = Members.insert({
              mid: `${row[1]}`,
              name: `${row[2]} ${row[3]}`,
              email,
              lock,
              liability,
              youth: medlem === 'Ungdom',
              family: medlem === 'Familj' || (medlem !== 'Individ' && medlem !== 'Ungdom'),
              type: medlem === 'Ungdom' ? 'youthdiscount' : 'normal'
            });
            const payments = extractPayments(row);
            payments.forEach((payment) => {
              payment.mid = memberId;
              Memberships.insert(payment);
            });
          } catch (err) {
            console.log(`Failed importing member: ${row[2]} ${row[3]}`);
            console.log(`Email is: ${email}`);
          }

        }
      });

      Object.keys(mid2family).forEach((mid) => {
        const member = Members.findOne({ mid });
        const patron = Members.findOne({ mid: mid2family[mid] });
        console.log(`Adding family relation from ${member.name} to ${patron.name}`);
        Members.update(member._id, { $set: { infamily: patron._id } });
      })
    }
  }
});

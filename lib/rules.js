export const reminderDays = 21;
export const startDateFromAmount = (amount, member, potentialLabPayment) => {
  const now = new Date();
  const amountInt = typeof amount === "number" ? amount : parseInt(amount);
  // If pure lab payment, take that as start date
  if (amountInt === 600 || (potentialLabPayment && amountInt === 300)) {
    // only take future lab end date as start date, otherwise take today
    return member.lab && member.lab > now ? member.lab : now;
  }
  return member.member && member.member > now ? member.member : now;
};
export const detectPotentialLabPayment = (member) => {
  const now = new Date();
  // If member, and membership is has not just expired (or is about to) (roughly 2 month in both directions)
  if (member.member && Math.abs(member.member-now) > 5000000000) {
    true;
  }
  return false;
};
export const membershipFromPayment = (paymentDate, amount, first, potentialLabPayment) => {
  const start = new Date(paymentDate);
  let labend = new Date(paymentDate);
  let memberend = new Date(paymentDate);
  let type = 'member';
  let family = false;
  let discount = false;
  const amountInt = typeof amount === "number" ? amount : parseInt(amount);
  memberend.setDate(labend.getDate() + (first ? 14 : 7));
  labend.setDate(labend.getDate() + (first ? 14 : 7));
  switch (amountInt) {
    case 100:
      discount = true;
      memberend.setFullYear(memberend.getFullYear() + 1);
      labend = undefined;
      break;
    case 200:
      memberend.setFullYear(memberend.getFullYear() + 1);
      labend = undefined;
      break;
    case 300:
      if (potentialLabPayment) {
        labend.setMonth(labend.getMonth() + 3);
        memberend = undefined;
        type = 'lab';
        family = false;
      } else {
        family = true;
        memberend.setFullYear(memberend.getFullYear() + 1);
        labend = undefined;
      }
      break;
    case 400:
      discount = true;
      labend.setMonth(labend.getMonth() + 3);
      memberend.setFullYear(memberend.getFullYear() + 1);
      type = 'labandmember';
      family = false;
      break;
    case 500:
      labend.setMonth(labend.getMonth() + 3);
      memberend.setFullYear(memberend.getFullYear() + 1);
      type = 'labandmember';
      family = false;
      break;
    case 600:
      labend.setMonth(labend.getMonth() + 6);
      memberend = undefined;
      type = 'lab';
      family = false;
      break;
    case 700:
      discount = true;
      labend.setMonth(labend.getMonth() + 6);
      memberend.setFullYear(memberend.getFullYear() + 1);
      type = 'labandmember';
      family = false;
      break;
    case 800:
      labend.setMonth(labend.getMonth() + 6);
      memberend.setFullYear(memberend.getFullYear() + 1);
      type = 'labandmember';
      family = false;
      break;
    case 900:
      labend.setMonth(labend.getMonth() + 6);
      memberend.setFullYear(memberend.getFullYear() + 1);
      type = 'labandmember';
      family = true;
      break;
    case 1000:
      labend.setMonth(labend.getMonth() + 12);
      memberend.setFullYear(memberend.getFullYear() + 1);
      type = 'labandmember';
      family = false;
      discount = true;
      break;
    case 1200:
      labend.setMonth(labend.getMonth() + 12);
      memberend.setFullYear(memberend.getFullYear() + 1);
      type = 'labandmember';
      family = true;
      discount = true;
      break;
  }
  return {
    start,
    labend,
    memberend,
    type,
    discount,
    amount: amountInt,
    family,
  }
};

export const reminderState = (obj) => {
  if (obj.infamily) {
    return new Spacebars.SafeString('');
  }
  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setDate(reminderTime.getDate() + reminderDays);
  const labReminderNeeded = obj.lab && obj.lab < reminderTime && obj.lab > now;
  const memberReminderNeeded = obj.member && obj.member < reminderTime && obj.member > now;
  const recentReminderRange = new Date();
  recentReminderRange.setDate(recentReminderRange.getDate() - reminderDays*2);
  const recentlyReminded = obj.reminder && obj.reminder > recentReminderRange;
  let state;
  if (recentlyReminded) {
    state = 'done';
  } else if (labReminderNeeded || memberReminderNeeded) {
    state = 'needed';
  } else {
    state = obj.reminder ? 'old' : 'none';
  }

  return {
    state,
    date: obj.reminder,
    formatted: moment(obj.reminder).format("YYYY-MM-DD")
  };
};
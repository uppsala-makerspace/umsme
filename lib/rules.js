export const reminderDays = 21;
export const membershipFromPayment = (paymentDate, amount, first, alreadyOnlyMember) => {
  const start = new Date(paymentDate);
  const end = new Date(paymentDate);
  let type = 'member';
  let family = false;
  let discount = false;
  const amountInt = typeof amount === "number" ? amount : parseInt(amount);
  end.setDate(end.getDate() + (first ? 14 : 7));
  switch (amountInt) {
    case 100:
      discount = true;
      end.setFullYear(end.getFullYear() + 1);
      break;
    case 200:
      end.setFullYear(end.getFullYear() + 1);
      break;
    case 300:
      if (alreadyOnlyMember) {
        end.setMonth(end.getMonth() + 3);
        type = 'lab';
        family = false;
      } else {
        family = true;
        end.setFullYear(end.getFullYear() + 1);
      }
      break;
    case 500:
      end.setMonth(end.getMonth() + 3);
      type = 'labandmember';
      family = false;
      break;
    case 600:
      end.setMonth(end.getMonth() + 6);
      type = 'lab';
      family = false;
      break;
    case 800:
      end.setMonth(end.getMonth() + 6);
      type = 'labandmember';
      family = false;
      break;
    case 1000:
      end.setMonth(end.getMonth() + 12);
      type = 'labandmember';
      family = false;
      discount = true;
      break;
    case 1200:
      end.setMonth(end.getMonth() + 12);
      type = 'labandmember';
      family = true;
      discount = true;
      break;
  }
  return {
    start,
    end,
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
  const reminderTime = new Date();
  reminderTime.setDate(reminderTime.getDate() + reminderDays);
  const reminderNeeded = obj.lab < reminderTime || obj.member < reminderTime;
  const recentReminderDate = new Date();
  recentReminderDate.setDate(recentReminderDate.getDate() - reminderDays);
  const recentlyReminded = obj.reminder && obj.reminder > recentReminderDate;
  let state;
  if (recentlyReminded) {
    state = 'done';
  } else if (reminderNeeded) {
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
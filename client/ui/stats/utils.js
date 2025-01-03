// Time before considering a member has *left*, before this time the member is considered *disappeared*
// Currently set to half a year.
const renewingLimit = 1000*3600*24*30*6;

/**
 * Builds an index mapping users to object with ordered memberships.
 * @param Memberships
 * @return {{memberships: []}}
 */
const groupAndOrder = (Memberships) => {
  const index = {};
  Memberships.find().forEach((ms) => {
    let obj = index[ms.mid];
    if (!obj) {
      obj = { memberships: [] };
      index[ms.mid] = obj;
    }
    obj.memberships.push(ms);
  });
  Object.values(index).forEach(obj =>
    obj.memberships.sort((a, b) => a.start < b.start ? -1 : 1));
  return index;
};

/**
 * Enrich the object (per member) containing:
 * left - if the member has not renewed for at least half a year.
 * disappeared - array of times the member did not renew within half a year
 * rejoined - array of times the member rejoined after a disappearing
 * renewTime - array of times the member renewed within the the renew time (half a year)
 * startYears - the years the member started a membership period
 *
 * @param {{string: {memberships: []}}} index
 */
const detectJoiningInfo = (index) => {
  Object.values(index).forEach(obj => {
    obj.disappeared = [];
    obj.renewed = [];
    obj.rejoined = [];
    obj.renewTime = [];
    obj.startYears = {};
    let lastMembershipExperiationDate;
    let memberType;
    obj.memberships.forEach(ms => {
      if (ms.type === 'member' || ms.type === 'labandmember') {
        obj.startYears[ms.start.getFullYear()] = true;
        if (lastMembershipExperiationDate) {
          const renewTime = ms.start - lastMembershipExperiationDate;
          const days = renewTime / 1000 / 3600 / 24;
          if (days < -310) {
            if (memberType === 'member' && ms.type === 'labandmember') {
              console.log(`${ms.start.getFullYear()} Ignoring double payment, days ${days}, mid: ${ms._id}`);
            } else {
              console.log(`${ms.start.getFullYear()} Probably wrong categorization, days ${days}, mid: ${ms._id}`);
            }
            return;
          }
          obj.renewTime.push(renewTime);
          if (renewTime < renewingLimit) {
            obj.renewed.push(ms.start);
          } else {
            obj.disappeared.push(lastMembershipExperiationDate);
            obj.rejoined.push(ms.start);
          }
        } else {
          obj.joined = ms.start;
        }
        if (ms.memberend) {
          lastMembershipExperiationDate = ms.memberend;
          memberType = ms.type;
        }
      }
    });
    obj.years = Object.keys(obj.startYears).length;
    const renewTime = new Date() - lastMembershipExperiationDate;
    if (renewTime > renewingLimit) {
      obj.left = lastMembershipExperiationDate;
    } else if (renewTime > 0) {
      obj.disappeared.push(lastMembershipExperiationDate);
    }
  });
}

/**
 * Statistics within a specific period
 *
 * @param Memberships
 * @param members
 * @param from
 * @param to
 * @return {{memberAgeLeft: *[], memberAge: *[], joined: *[], renewLabels: *[], churn: *[], index: {memberships: []}, memberAgeLabels: *[], labels: *[], renewed: *[], renewTime: *[], left: *[], rejoined: *[], disappeared: *[]}}
 */
export const statsPerMonth = (Memberships, members, from, to) => {
  const index = groupAndOrder(Memberships);
  detectJoiningInfo(index);
  const joined = {};
  const left = {};
  const renewed = {};
  const disappeared = {};
  const rejoined = {};
  const renewTime = [];
  const renewLabels = [];
  for (let i = -40;i <= 26; i++) {
    renewTime[i+40] = 0;
    renewLabels[i+40] = `Week ${i}`;
  }
  const memberAge = [];
  const memberAgeLeft = [];
  const memberAgeLabels = [];
  for (let i = 0;i <= 20; i++) {
    memberAge[i] = 0;
    memberAgeLeft[i] = 0;
    memberAgeLabels[i] = `${i} ${i=== 1 ? 'year' : 'years'}`;
  }

  let earliest;
  let latest;
  const incrementYearMonth = (idx, date) => {
    if (date < to && date > from) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const yobj = idx[year] = idx[year] || {};
      yobj[month] = yobj[month] ? yobj[month] + 1 : 1;
      if (!latest || date > latest) {
        latest = date;
      }
      if (!earliest || date < earliest) {
        earliest = date;
      }
    }
  };

  Object.values(index).forEach(obj => {
    incrementYearMonth(joined, obj.joined);
    if (obj.left) {
      incrementYearMonth(left, obj.left);
      memberAgeLeft[obj.years] += 1;
    } else {
      memberAge[obj.years] += 1;
    }
    obj.disappeared.forEach(d => incrementYearMonth(disappeared, d));
    obj.renewed.forEach(d => incrementYearMonth(renewed, d));
    obj.rejoined.forEach(d => incrementYearMonth(rejoined, d));
    obj.renewTime.forEach(t => {
      const chunk = Math.ceil(t / 1000 / 3600 / 24 / 7);
      console.log(`Weeks before renewing: ${chunk}`);
      renewTime[chunk+40] += 1
    });
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const labels = [];
  const joinedD = [];
  const leftD = [];
  const renewedD = [];
  const rejoinedD = [];
  const disappearedD = [];
  const churn = [];
  const firstYear = earliest.getFullYear();
  const firstMonth = earliest.getMonth();
  const lastYear = latest.getFullYear();
  const lastMonth = latest.getMonth();
  const years = [];
  for (let y = firstYear; y <= lastYear; y++) {
    years.push(y);
  }
  if (firstYear) {
    const addForMonth = (year, month) => {
      labels.push(`${year} - ${months[month]}`);
      renewedD.push((renewed[year] || {})[month] || 0);
      joinedD.push((joined[year] || {})[month] || 0);
      const leftThisMonth = (left[year] || {})[month] || 0;
      leftD.push(-leftThisMonth);
      rejoinedD.push((rejoined[year] || {})[month] || 0);
      disappearedD.push(-(disappeared[year] || {})[month] || 0);
      const middleOfMonth = new Date(`${year}-${month+1}-15`);
      const totalMember = members.find(member => member.x > middleOfMonth);
      const total = totalMember ? totalMember.y : members[members.length-1].y;
      churn.push(Math.round(12*100*leftThisMonth/(total === 0 ? 1 : total)));
    }
    years.forEach((y) => {
      const mstart = y === firstYear ? firstMonth : 0;
      const mstop = y === lastYear ? lastMonth : 11;
      for (let m = mstart; m <= mstop; m++) {
        addForMonth(y, m);
      }
    })
  }
  return {
    labels,
    joined: joinedD,
    disappeared: disappearedD,
    renewed: renewedD,
    rejoined: rejoinedD,
    left: leftD,
    churn,
    renewTime,
    renewLabels,
    memberAge,
    memberAgeLeft,
    memberAgeLabels,
    index,
  };
};


const datesAreOnSameDay = (first, second) =>
  first && second &&
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

export const sortAndaccumulate = (arr, from, to) => {
  arr.sort((a, b) => {
    return a.when < b.when ? -1 : 1;
  });
  const now = new Date();
  let last;
  arr = arr.filter((m) => {
    if (m.when > now) {
      return false;
    }
    if (last) {
      if (datesAreOnSameDay(last.when, m.when)) {
        last.value += m.value;
        return false;
      }
    }
    last = m;
    return true;
  });

  let accumulate = 0;
  return arr.map((ev) => {
    accumulate += ev.value;
    return {x: ev.when, y: accumulate};
  }).filter(pair => ((from == null && pair.x < to) || (pair.x > from && pair.x < to)));
};

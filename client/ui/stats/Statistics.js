import { Template } from 'meteor/templating';
import Chart from 'chart.js/dist/Chart';
import { Memberships } from '/collections/memberships.js';
import './Statistics.html';

const datesAreOnSameDay = (first, second) =>
  first && second &&
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();
const sortAndaccumulate = (arr, from, to) => {
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

const extractPeriods = (events) => {
  const periods = {};
  events.forEach((ev) => {
    const obj = periods[ev.member] || {};
    if (ev.value === 1 && (!obj.start || obj.when < obj.start)) {
      obj.start = ev.when;
      periods[ev.member] = obj;
    } else if (ev.value === -1 && (!obj.end || obj.when > obj.end)) {
      obj.end = ev.when;
      periods[ev.member] = obj;
    }
  });
  return periods;
};

const statsPerMonth = (events, from, to) => {
  const periods = extractPeriods(events);
  const gained = {};
  const lost = {};
  const add = (idx, year, month) => {
    const yobj = idx[year] = idx[year] || {};
    yobj[month] = yobj[month] ? yobj[month] + 1 : 1;
  };
  Object.values(periods).forEach((p) => {
    if (p.start > from && p.start < to) {
      add(gained, p.start.getFullYear(), p.start.getMonth());
    }
    if (p.end && p.end > from && p.end < to) {
      add(lost, p.end.getFullYear(), p.end.getMonth());
    }
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Object.keys(gained).sort((a,b) => (parseInt(a)<parseInt(b) ? -1 : 1));
  const firstYear = years[0];
  const labels = [];
  const gainedD = [];
  const lostD = [];
  if (firstYear) {
    const firstMonth = Object.keys(gained[firstYear]).sort((a, b) => (parseInt(a) < parseInt(b) ? -1 : 1))[0];
    const currentYear = years[years.length - 1];
    const currentMonth = new Date().getMonth();
    const addForMonth = (year, month) => {
      labels.push(`${year} - ${months[month]}`);
      gainedD.push((gained[year] || {})[month] || 0);
      lostD.push(-(lost[year] || {})[month] || 0);
    }
    years.forEach((y) => {
      const mstart = y === firstYear ? firstMonth : 0;
      const mstop = y === currentYear ? currentMonth + 1 : 12;
      for (let m = mstart; m < mstop; m++) {
        addForMonth(y, m);
      }
    })
  }
  return {
    labels,
    gained: gainedD,
    lost: lostD
  }
};
const getDataSets = (from, to) => {
  let members = [];
  let plain = [];
  let labs = [];
  let family = [];
  let familylab = [];
  Memberships.find().forEach((ms) => {
    if (ms.type === 'member' || ms.type === 'labandmember') {
      members.push({ value: 1, when: ms.start, member: ms.mid });
      members.push({ value: -1, when: ms.memberend, member: ms.mid });
    }

    if (!ms.family && ms.type === 'member') {
      plain.push({ value: 1, when: ms.start });
      plain.push({ value: -1, when: ms.memberend });
    }
    if (!ms.family && ms.type === 'lab') {
      plain.push({ value: -1, when: ms.start });
      plain.push({ value: 1, when: ms.labend });
    }
    if (!ms.family && (ms.type === 'labandmember' || ms.type === 'lab')) {
      labs.push({ value: 1, when: ms.start });
      labs.push({ value: -1, when: ms.memberend || ms.labend });
    }
    if (ms.family && ms.type === 'member') {
      family.push({ value: 1, when: ms.start });
      family.push({ value: -1, when: ms.memberend });
    }
    if (ms.family && ms.type === 'lab') {
      family.push({ value: -1, when: ms.start });
      family.push({ value: 1, when: ms.labend });
    }
    if (ms.family && (ms.type === 'labandmember' || ms.type === 'lab')) {
      familylab.push({ value: 1, when: ms.start });
      familylab.push({ value: -1, when: ms.memberend || ms.labend });
    }
  });
  const { labels, gained, lost } = statsPerMonth(members, from, to);
  members = sortAndaccumulate(members, from, to);
  plain = sortAndaccumulate(plain, from, to);
  labs = sortAndaccumulate(labs, from, to);
  family = sortAndaccumulate(family, from, to);
  familylab = sortAndaccumulate(familylab, from, to);
  document.getElementById('totalmembers').innerText = members.length > 0 ? members[members.length-1].y : '-';
  document.getElementById('nolab').innerText = plain.length > 0 ? plain[plain.length-1].y : '-';
  document.getElementById('lab').innerText = labs.length > 0 ? labs[labs.length-1].y : '-';
  document.getElementById('nolabfamily').innerText = family.length > 0 ? family[family.length-1].y : '-';
  document.getElementById('labfamily').innerText = familylab.length > 0 ? familylab[familylab.length-1].y : '-';

  return {
    graph1: {
      datasets: [
        {
          label: 'All members',
          borderWidth: 2,
          data: members,
          borderColor: 'rgba(0, 0, 0)',
          fill: false,
          cubicInterpolationMode: "monotone",
        },
        {
          label: 'No lab',
          borderWidth: 2,
          cubicInterpolationMode: 'monotone',
          data: plain,
          borderColor: 'rgba(255, 99, 132)',
          fill: false,
          steppedLine: 'before',
        },
        {
          label: 'Lab',
          borderWidth: 2,
          cubicInterpolationMode: 'monotone',
          data: labs,
          borderColor: 'rgba(54, 162, 235)',
          fill: false,
          steppedLine: 'before',
        },
        {
          label: 'No lab - family',
          borderWidth: 2,
          cubicInterpolationMode: 'monotone',
          data: family,
          borderColor: 'rgba(255, 206, 86)',
          fill: false,
          steppedLine: 'before',
        },
        {
          label: 'Lab - family',
          borderWidth: 2,
          cubicInterpolationMode: 'monotone',
          data: familylab,
          borderColor: 'rgba(75, 192, 192)',
          fill: false,
          steppedLine: 'before',
        },
      ],
    },
    graph2: {
      labels,
      datasets: [
        {
          label: 'Gained members',
          borderWidth: 2,
          data: gained,
          borderColor: 'rgba(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
        },
        {
          label: 'Lost members',
          borderWidth: 2,
          data: lost,
          borderColor: 'rgba(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: true,
        }
      ]
    }
  };
};

let mychart1;
let mychart2;
const redrawGraphs = (from, to) => {
  if (mychart1) {
    mychart1.destroy();
    mychart2.destroy();
  }
  const {graph1, graph2} = getDataSets(from, to);
  mychart1 = new Chart('membersPerDay', {
    type: 'line',
    data: graph1,
    options: {
      responsive: true,
      scales: {
        yAxes: [{
          stacked: false,
          ticks: {
            beginAtZero: true,
            stepSize: 1
          },
        }],
        xAxes: [{
          type: 'time',
          time: {
            displayFormats: {
              quarter: 'MMM YYYY'
            }
          }
        }]
      }
    }
  });
  mychart2 = new Chart('membersPerMonths', {
    type: 'bar',
    data: graph2,
    options: {
      responsive: true,
      scales: {
        xAxes: [{
          stacked: true,
        }],
        yAxes: [{
          stacked: true,
          ticks: {
            beginAtZero: true
          }
        }],
      }
    }
  });
};

const redrawGraphFor = (interval) => {
  interval = interval || 'all';
  const now = new Date();
  switch (interval) {
    case 'all':
      redrawGraphs(null, now);
      break;
    case 'year':
      redrawGraphs(new Date().setFullYear(now.getFullYear()-1), now);
      break;
    case 'quarter':
      redrawGraphs(new Date().setMonth(now.getMonth()-3), now);
      break;
    case 'month':
      redrawGraphs(new Date().setMonth(now.getMonth()-1), now);
      break;
  }
};

Template.Statistics.onCreated(function() {
  this.subscribe('memberships');
});

Template.Statistics.onRendered(function () {
  // When ready, animate
  this.autorun(() => {
    if (!this.subscriptionsReady()) {
      return;
    }
    // Need defer or setTimeout(0) or afterFlush to wait until after rendering is done
    Meteor.defer(redrawGraphFor);
  });
});

Template.Statistics.events({
  'change .timeinterval': function (event, instance) {
    if (event.target.checked) {
      redrawGraphFor(event.target.value);
    }
  }
});
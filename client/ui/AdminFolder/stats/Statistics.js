import { Template } from 'meteor/templating';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-moment';
import { Memberships } from '/collections/memberships.js';
import './Statistics.html';
import { statsPerMonth, sortAndaccumulate } from './utils';

const getDataSets = (from, to) => {
  let members = [];
  let individual = [];
  let indiviudalLab = [];
  let family = [];
  let familyLab = [];
  const member2Join = {};
  Memberships.find().forEach((ms) => {
    const oldMs = member2Join[ms.mid];
    if (!oldMs || ms.start < oldMs.start) {
      member2Join[ms.mid] = ms;
    }
  });
  Memberships.find().forEach((ms) => {
    // All memberships, including both individuals and family, independent if they are lab or not.
    // Members part of a family are not counted as they don't have connected membership objects (as they do not pay).
    if (ms.type === 'member' || ms.type === 'labandmember') {
      const joined = member2Join[ms.mid]._id === ms._id;
      members.push({ value: 1, when: ms.start, joined, member: ms.mid });
      members.push({ value: -1, when: ms.memberend, member: ms.mid });
    }

    // Individual membership payment
    if (!ms.family && ms.type === 'member') {
      individual.push({ value: 1, when: ms.start });
      individual.push({ value: -1, when: ms.memberend });
    }
    // Individual membership AND lab payment
    if (!ms.family && ms.type === 'labandmember') {
      indiviudalLab.push({ value: 1, when: ms.start });
      indiviudalLab.push({ value: -1, when: ms.memberend || ms.labend });
    }
    // Individual lab "upgrade" payment
    if (!ms.family && ms.type === 'lab') {
      indiviudalLab.push({ value: 1, when: ms.start });
      indiviudalLab.push({ value: -1, when: ms.memberend || ms.labend });
      // Below is because when someone "upgrades" to lab, we need to subtract them from the individual membership graph.
      individual.push({ value: -1, when: ms.start });
      individual.push({ value: 1, when: ms.labend });
    }

    // Family membership payment
    if (ms.family && ms.type === 'member') {
      family.push({ value: 1, when: ms.start });
      family.push({ value: -1, when: ms.memberend });
    }
    // Family membership AND lab payment
    if (ms.family && ms.type === 'labandmember') {
      familyLab.push({ value: 1, when: ms.start });
      familyLab.push({ value: -1, when: ms.memberend || ms.labend });
    }
    // Family lab "upgrade" payment
    if (ms.family && ms.type === 'lab') {
      familyLab.push({ value: 1, when: ms.start });
      familyLab.push({ value: -1, when: ms.memberend || ms.labend });
      // Below is because when a family "upgrades" to lab, we need to subtract them from the family membership graph.
      family.push({ value: -1, when: ms.start });
      family.push({ value: 1, when: ms.labend });
    }
  });
  members = sortAndaccumulate(members, from, to);
  individual = sortAndaccumulate(individual, from, to);
  indiviudalLab = sortAndaccumulate(indiviudalLab, from, to);
  family = sortAndaccumulate(family, from, to);
  familyLab = sortAndaccumulate(familyLab, from, to);
  document.getElementById('totalmembers').innerText = members.length > 0 ? members[members.length-1].y : '-';
  document.getElementById('nolab').innerText = individual.length > 0 ? individual[individual.length-1].y : '-';
  document.getElementById('lab').innerText = indiviudalLab.length > 0 ? indiviudalLab[indiviudalLab.length-1].y : '-';
  document.getElementById('nolabfamily').innerText = family.length > 0 ? family[family.length-1].y : '-';
  document.getElementById('labfamily').innerText = familyLab.length > 0 ? familyLab[familyLab.length-1].y : '-';

  const { labels, joined, left, churn, renewed, rejoined, disappeared, renewTime, renewLabels, memberAge, memberAgeLeft, memberAgeLabels, index } = statsPerMonth(Memberships, members, from, to);

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
          data: individual,
          borderColor: 'rgba(255, 99, 132)',
          fill: false,
          steppedLine: 'before',
        },
        {
          label: 'Lab',
          borderWidth: 2,
          cubicInterpolationMode: 'monotone',
          data: indiviudalLab,
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
          data: familyLab,
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
          label: 'Members renewing',
          borderWidth: 2,
          data: renewed,
          borderColor: 'rgb(0,0,0)',
          backgroundColor: 'rgb(133,133,133)',
          fill: true,
        },
        {
          label: 'Members pausing',
          borderWidth: 2,
          data: disappeared,
          borderColor: 'rgb(255,156,0)',
          backgroundColor: 'rgb(255,201,129)',
          fill: true,
        },
        {
          label: 'Members rejoining',
          borderWidth: 2,
          data: rejoined,
          borderColor: 'rgb(41,148,0)',
          backgroundColor: 'rgb(138,210,122)',
          fill: true,
        },
        {
          label: 'Gained members',
          borderWidth: 2,
          data: joined,
          borderColor: 'rgba(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
        },
        {
          label: 'Lost members',
          borderWidth: 2,
          data: left,
          borderColor: 'rgba(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: true,
        }
      ]
    },
    graph3: {
      labels: labels,
      datasets: [
        {
          label: 'Percentage of lost members (churn)',
          borderWidth: 2,
          data: churn,
          borderColor: 'rgba(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          fill: true,
        },
      ]
    },
    graph4: {
      labels: renewLabels,
      datasets: [
        {
          label: 'Time it takes for members to renew',
          borderWidth: 2,
          data: renewTime,
          borderColor: 'rgb(0,0,0)',
          backgroundColor: 'rgb(133,133,133)',
          fill: true,
        },
      ]
    },
    graph5: {
      labels: memberAgeLabels,
      datasets: [
        {
          label: 'Number of years current members have been active',
          borderWidth: 2,
          data: memberAge,
          borderColor: 'rgb(41,148,0)',
          backgroundColor: 'rgb(138,210,122)',
          fill: true,
        },
        {
          label: 'Number of years members that has left has been active',
          borderWidth: 2,
          data: memberAgeLeft,
          borderColor: 'rgb(252,0,0)',
          backgroundColor: 'rgb(242,215,202)',
          fill: true,
        },
      ]
    },
    index
  };
};

let mychart1;
let mychart2;
let mychart3;
let mychart4;
let mychart5;
const redrawGraphs = (from, to) => {
  if (mychart1) {
    mychart1.destroy();
    mychart2.destroy();
  }
  const {graph1, graph2, graph3, graph4, graph5} = getDataSets(from, to);

  mychart1 = new Chart('membersPerDay', {
    type: 'line',
    data: graph1,
    options: {
      responsive: true,
      scales: {
        y: {
          stacked: false,
          ticks: {
            beginAtZero: true,
            stepSize: 1
          },
        },
        x: {
          type: 'time',
          time: {
            displayFormats: {
              quarter: 'MMM YYYY'
            }
          }
        }
      }
    }
  });
  mychart2 = new Chart('membersPerMonths', {
    type: 'bar',
    data: graph2,
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          ticks: {
            beginAtZero: true
          }
        },
      }
    }
  });
  mychart3 = new Chart('churn', {
    type: 'bar',
    data: graph3,
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          ticks: {
            beginAtZero: true
          }
        },
      }
    }
  });
  mychart4 = new Chart('renewTime', {
    type: 'bar',
    data: graph4,
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          ticks: {
            beginAtZero: true
          }
        },
      }
    }
  });
  mychart5 = new Chart('memberAge', {
    type: 'bar',
    data: graph5,
    options: {
      responsive: true,
      scales: {
        x: {
          stacked: true,
        },
        y: {
          stacked: true,
          ticks: {
            beginAtZero: true
          }
        },
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
  this.subscribe('members');
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
  'change .timeinterval': function (event) {
    if (event.target.checked) {
      redrawGraphFor(event.target.value);
    }
  }
});

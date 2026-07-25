import { Template } from 'meteor/templating';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-moment';
import { Memberships } from '/imports/common/collections/memberships.js';
import './Statistics.html';
import { statsPerMonth } from './utils';
import { buildSeries, sortAndAccumulate } from '/imports/stats/membershipSeries';

const getDataSets = (from, to) => {
  // One fetch, then everything is derived from a plain array. buildSeries walks
  // each member's timeline so overlapping memberships (upgrades) count once and
  // land in exactly one category.
  const memberships = Memberships.find().fetch();
  const {
    memberEvents,
    individualEvents,
    individualLabEvents,
    familyEvents,
    familyLabEvents,
  } = buildSeries(memberships);

  const members = sortAndAccumulate(memberEvents, from, to);
  const individual = sortAndAccumulate(individualEvents, from, to);
  const individualLab = sortAndAccumulate(individualLabEvents, from, to);
  const family = sortAndAccumulate(familyEvents, from, to);
  const familyLab = sortAndAccumulate(familyLabEvents, from, to);

  const currentValue = (series) => (series.length > 0 ? series[series.length - 1].y : '-');
  document.getElementById('totalmembers').innerText = currentValue(members);
  document.getElementById('nolab').innerText = currentValue(individual);
  document.getElementById('lab').innerText = currentValue(individualLab);
  document.getElementById('nolabfamily').innerText = currentValue(family);
  document.getElementById('labfamily').innerText = currentValue(familyLab);

  const { labels, joined, left, churn, renewed, rejoined, disappeared, renewTime, renewLabels, memberAge, memberAgeLeft, memberAgeLabels, index } = statsPerMonth(memberships, members, from, to);

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
          data: individualLab,
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

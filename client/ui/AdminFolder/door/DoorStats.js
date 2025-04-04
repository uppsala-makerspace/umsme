import './DoorStats.html';
import { Unlocks } from '/collections/unlocks.js';
import { Members } from '/collections/members.js';
import Chart from 'chart.js/dist/Chart';

Template.DoorStats.onCreated(function() {
  Meteor.subscribe('unlocks');
});

Template.DoorStats.helpers({
});

/*
I20200905-12:41:33.293(2)?     {
I20200905-12:41:33.294(2)?       timestamp: '2020-09-01T17:58:37+00:00',
I20200905-12:41:33.294(2)?       lock: 'lock-fde72d8df2e0',
I20200905-12:41:33.294(2)?       lockname: 'UMS ytterdörr',
I20200905-12:41:33.294(2)?       user: 'user-64cffd8b6179',
I20200905-12:41:33.294(2)?       username: 'bkcsoft:208637',
I20200905-12:41:33.294(2)?       operation: 'locked'
I20200905-12:41:33.294(2)?     }
 */


let mychart;
const draw = (data) => {
  if (mychart) {
    mychart.destroy();
  }

  mychart = new Chart('visits', {
    type: 'bar',
    data: data,
    options: {
      responsive: true,
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      }
    }
  });
};

const unlocksPerUser = (history) => {
  const users = {};
  history.forEach((h) => {
    let user = users[h.username];
    if (!user) {
      user = [];
      users[h.username] = user;
    }
    user.push(h);
  });
  return users;
};

const calc = (users) => {
  const usernames = Object.keys(users);
  let zero = usernames.length, five = 0, ten = 0, twenty = 0, fifty = 0, more = 0;
  usernames.forEach((username) => {
    const visits = users[username].length;
    zero--;
    if (visits <= 5) {
      five++;
    } else if (visits <= 10) {
      ten++;
    } else if (visits <= 20) {
      twenty++;
    } else if (visits <= 50) {
      fifty++;
    } else {
      more++;
    }
  });
  return {
    labels: ['0', '1-5', '6-10', '11-20', '21-50', '50-?'],
    datasets: [
      {
        label: 'Dörröppningar',
        borderWidth: 2,
        data: [zero, five, ten, twenty, fifty, more],
        borderColor: 'rgba(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
      }
    ]
  };
};


Template.DoorStats.events({
  'click .checkDoor': function (event, instance) {
    console.log("Clicked");
    Meteor.call('lockHistory', (err, res) => {
      if (err) {
        instance.state.set('data', 'error: ' + err.error);
      } else {
        const users = unlocksPerUser(res);
        const data = calc(users);
        draw(data);
      }
    });
  },
  'click .syncDoor': function (event, instance) {
    console.log("Clicked");
    Meteor.call('mailLockHistory', (err, res) => {
      if (err) {
        document.getElementById('lockResults').innerHTML = err.error;
      } else {
        document.getElementById('lockResults').innerHTML = res;
      }
    });
  },
  'click .unlocks': function (event, instance) {
    console.log("Clicked unlock");

    const users = {};
    Unlocks.find().forEach(unlock => {
      let username = unlock.username;
      if (username.endsWith(':')) {
        username = username.substring(0, username.length - 1);
      }
      let user = users[username];
      if (!user) {
        user = [];
        users[username] = user;
      }
      user.push(unlock);
    });
    const data = calc(users);
    draw(data);
  },
});
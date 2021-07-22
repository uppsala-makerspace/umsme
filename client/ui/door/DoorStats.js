import './DoorStats.html';
import Chart from 'chart.js/dist/Chart';

Template.DoorStats.onCreated(function() {
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

const calc = (history) => {
  const users = {};
  history.forEach((h) => {
    let user = users[h.user];
    if (!user) {
      user = [];
      users[h.user] = user;
    }
    user.push(h);
  });
  let zero = 113, five = 0, ten = 0, twenty = 0, fifty = 0, more = 0;
  Object.keys(users).forEach((user) => {
    const visits = users[user].length;
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
        const data = calc(res);
        draw(data);
      }
    });
  },
});
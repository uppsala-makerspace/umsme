import './LockUserHistory.html';
import Chart from 'chart.js/dist/Chart';

Template.LockUserHistory.onCreated(function() {
});


Template.LockUserHistory.helpers({
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

  mychart = new Chart('users', {
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

function makeDate(d) {
	var year = d.getFullYear();
	var month = d.getMonth()+1;
	var day = d.getDate();
	var hours = d.getHours();
	var minutes = d.getMinutes();
	return year+"-"+month+"-"+day+" "+hours+":"+minutes
	
}
	
const calc = (history) => {
	const startdate = new Date(Date.now() - 86400000);
	const enddate = new Date(Date.now());
	var filteredData = history.filter(d => {var time = new Date(d.timestamp).getTime();
                             return (startdate < time && time < enddate);
                            });
	console.log(filteredData);
	var body = "Entries from " + makeDate(startdate) + " until " + makeDate(enddate) + "\n"
  filteredData.forEach((entry) => {
	  body = body + entry.timestamp + " " + entry.operation + " " + entry.user + "\n"
  });
	body = body + "\n--\nKind regards\nUppsala Makerspace\n"
	console.log(body);
	mail('pass@ekebyindustrihus.com','UMS Entrys '+makeDate(startdate)+' - '+makeDate(enddate),body,'pass@uppsalamakerspace.se');
};


Template.LockUserHistory.events({
  'click .checkUsers': function (event, instance) {
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

import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';


FlowRouter.route('/appbody', {
    name: 'appbody',
    action() {
      BlazeLayout.render('AppBody', {}, { root: '#blaze-target' }); // Rendera i #blaze-target
    }
  });

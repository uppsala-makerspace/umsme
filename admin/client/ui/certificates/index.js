import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import "./certificates.css";
import "./CertificateList";
import "./CertificateAdd";
import "./CertificateView";

FlowRouter.route('/certificates', {
  name: 'certificates',
  action() {
    this.render('AppBody', {main: 'CertificateList'});
  }
});

FlowRouter.route('/certificates/add', {
  name: 'addcertificate',
  action() {
    this.render('AppBody', {main: 'CertificateAdd'});
  }
});

FlowRouter.route('/certificate/:_id', {
  name: 'certificateview',
  action() {
    this.render('AppBody', {main: 'CertificateView'});
  }
});

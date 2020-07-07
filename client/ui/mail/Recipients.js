import { Template } from 'meteor/templating';
import './Recipients.html';

AutoForm.addInputType('recipients', {
  template: 'Recipients',
  valueOut: function(doc) {
    return ['hepp'];
  }
})
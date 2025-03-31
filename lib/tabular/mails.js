import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Mails } from '../../collections/mails';
import { models } from "../models";
import { extractor, dateViewFunction } from "../fieldsUtils";

const mailDefaults = {
  filter: ['template', 'to.$', 'failed.$', 'sms', 'mail'],
  enhance: [{
    data: 'senddate',
    title: 'Sent date',
    render: dateViewFunction(true)
  }, {
    data: 'failed',
    render(value, type, doc) {
      return new Spacebars.SafeString(`${value ? value.length : 0}`);
    }
  }, {
    data: 'to',
    title: 'Sent',
    render(value, type, doc) {
      return new Spacebars.SafeString(`${value ? value.length : 0}`);
    }
  }, {
    data: 'family',
    title: 'Family members'
  }]
};

new Tabular.Table({
  name: "Mails",
  autoWidth: false,
  collection: Mails,
  order: [[6, "desc"]],
  columns: extractor(models.mail, mailDefaults),
  allow(userID) {
    return userID !== null;
  }
});
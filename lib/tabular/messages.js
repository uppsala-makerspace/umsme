import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Messages } from '../../collections/messages';
import { models } from "../models";
import { extractor, dateViewFunction } from "../fieldsUtils";

const messageDefaults = {
  filter: ['template', 'member', 'membership', 'to', 'messagetext'],
  enhance: [{
    data: 'senddate',
    sortOrder: 0,
    sortDirection: 'descending',
    render: dateViewFunction(true)
  }]
};

new Tabular.Table({
  name: "Messages",
  autoWidth: false,
  collection: Messages,
  order: [[2, "desc"]],
  columns: extractor(models.message, messageDefaults),
  allow(userID) {
    return userID !== null;
  }
});
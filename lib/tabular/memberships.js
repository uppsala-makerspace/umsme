import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Memberships } from '../../collections/memberships';
import { models } from "../models";
import { extractor } from "../fieldsUtils";

const membershipDefaults = {
  filter: ['mid', 'pid'],
  enhance: [{
    data: 'start',
    sortOrder: 0,
    sortDirection: 'descending',
  }],
  append: [{
    title: 'Payment',
    render(value, type, doc) {
      if (doc.pid) {
        return new Spacebars.SafeString(`<span class="label label-success">Bank</span>`);
      }
    }
  }]
};

new Tabular.Table({
  name: "Memberships",
  autoWidth: false,
  collection: Memberships,
  order: [[1, "desc"]],
  columns: extractor(models.membership, membershipDefaults),
  allow(userID) {
    return userID !== null;
  }
});
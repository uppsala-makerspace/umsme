import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { Memberships } from '/imports/common/collections/memberships';
import { models } from "/imports/common/lib/models";
import { extractor } from "/imports/common/lib/fieldsUtils";

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
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, 'admin')
});
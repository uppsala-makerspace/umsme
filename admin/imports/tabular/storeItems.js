import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { StoreItems } from '/imports/common/collections/storeItems';
import { models } from '/imports/common/lib/models';
import { extractor } from '/imports/common/lib/fieldsUtils';

// Keep the code, the Swedish name, price, membership requirement and status.
// The filter is a blocklist, so anything new in the model shows up as a column
// unless it is named here.
const storeItemDefaults = {
  filter: [
    'name', 'name.en',
    'description', 'description.sv', 'description.en',
    'minPrice', 'maxPrice',
    'commentRequired', 'commentPlaceholder',
    'commentPlaceholder.sv', 'commentPlaceholder.en',
    'dimension', 'imageFileId', 'imageMimeType', 'sortOrder', 'createdAt',
  ],
};

new Tabular.Table({
  name: 'StoreItems',
  autoWidth: false,
  collection: StoreItems,
  order: [[0, 'asc']],
  columns: extractor(models.storeItem, storeItemDefaults),
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, ['admin', 'board']),
});

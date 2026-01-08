import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { LiabilityDocuments } from '/imports/common/collections/liabilityDocuments';
import { models } from "/imports/common/lib/models";
import { extractor } from "/imports/common/lib/fieldsUtils";

const liabilityDocumentDefaults = {
  filter: ['text', 'text.sv', 'text.en']
};

new Tabular.Table({
  name: "LiabilityDocuments",
  collection: LiabilityDocuments,
  autoWidth: false,
  order: [[1, "desc"]],
  columns: extractor(models.liabilityDocument, liabilityDocumentDefaults),
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, 'admin')
});

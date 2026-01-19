import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { Certificates } from '/imports/common/collections/certificates';
import { models } from "/imports/common/lib/models";
import { extractor } from "/imports/common/lib/fieldsUtils";

const certificateDefaults = {
  filter: ['name', 'description', 'description.sv', 'description.en', 'prerequisites', 'prerequisites.$', 'certifiers', 'certifiers.$', 'certifierRole']
};

new Tabular.Table({
  name: "Certificates",
  autoWidth: false,
  collection: Certificates,
  order: [[0, "asc"]],
  columns: extractor(models.certificate, certificateDefaults),
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, 'admin')
});

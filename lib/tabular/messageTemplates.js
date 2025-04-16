import './initTabular';
import 'meteor/aldeed:collection2/static';
import Tabular from 'meteor/aldeed:tabular';
import { Roles } from 'meteor/roles';
import { MessageTemplates } from '/collections/templates';
import { models } from "../models";
import { extractor } from "../fieldsUtils";


const messageTemplateDefaults = {
  filter: ['messagetext', 'subject', 'created', 'modified', 'sms']
};

new Tabular.Table({
  name: "MessageTemplates",
  collection: MessageTemplates,
  autoWidth: false,
  columns: extractor(models.template, messageTemplateDefaults),
  allow: (userID) => userID && Roles.userIsInRoleAsync(userID, 'admin')
});
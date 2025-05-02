import { models } from './models';
import SimpleSchema from "meteor/aldeed:simple-schema";

//import SimpleSchema from 'simpl-schema';
SimpleSchema.extendOptions(['autoform']);

export const schemas = {
  member: new SimpleSchema(models.member),
  message: new SimpleSchema(models.message),
  membership: new SimpleSchema(models.membership),
  template: new SimpleSchema(models.template),
  payment: new SimpleSchema(models.payment),
  lockusers: new SimpleSchema(models.lockusers),
  mails: new SimpleSchema(models.mail),
  comments: new SimpleSchema(models.comment),
  unlocks: new SimpleSchema(models.unlocks),
  users: new SimpleSchema(models.users),
  initiatedPayments: new SimpleSchema(models.initiatedPayments)
};